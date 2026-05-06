#!/usr/bin/env python3
"""
Extract all YouTube videos for a channel and export a clean dataset.

This script focuses on extraction (phase 1):
- Resolves channel by handle/channel_id/uploads_playlist_id
- Traverses all uploads playlist pages
- Hydrates video statistics in 50-id batches
- Exports JSON + CSV
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional


YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"


def load_dotenv_local(repo_root: Path) -> None:
    env_file = repo_root / ".env.local"
    if not env_file.exists():
        return

    for line in env_file.read_text(encoding="utf-8").splitlines():
        text = line.strip()
        if not text or text.startswith("#") or "=" not in text:
            continue
        key, value = text.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def youtube_fetch(path: str, params: Dict[str, str], api_key: str, retries: int = 3) -> Dict:
    query = dict(params)
    query["key"] = api_key
    url = f"{YOUTUBE_API_BASE}/{path}?{urllib.parse.urlencode(query)}"

    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(url, timeout=30) as response:
                payload = response.read().decode("utf-8")
            return json.loads(payload)
        except Exception as exc:
            if attempt == retries:
                raise RuntimeError(f"YouTube API error on {path}: {exc}") from exc
            time.sleep(1.2 * attempt)

    raise RuntimeError(f"YouTube API error on {path}")


def parse_handle(value: str) -> Optional[str]:
    text = (value or "").strip()
    if not text:
        return None
    if text.startswith("@"):
        return text[1:]
    text = re.sub(r"^https?://(www\.)?youtube\.com/", "", text, flags=re.IGNORECASE)
    parts = [p for p in text.split("/") if p]
    if not parts:
        return None
    if parts[0].startswith("@"):
        return parts[0][1:]
    if parts[0] in {"c", "user"} and len(parts) > 1:
        return parts[1]
    return parts[0]


def parse_channel_id(value: str) -> Optional[str]:
    text = (value or "").strip()
    if re.match(r"^UC[a-zA-Z0-9_-]{20,}$", text):
        return text
    text = re.sub(r"^https?://(www\.)?youtube\.com/", "", text, flags=re.IGNORECASE)
    parts = [p for p in text.split("/") if p]
    if len(parts) >= 2 and parts[0] == "channel":
        return parts[1]
    return None


def resolve_channel(
    api_key: str,
    handle: Optional[str],
    channel_id: Optional[str],
    uploads_playlist_id: Optional[str],
    allow_search_fallback: bool = False,
) -> Dict[str, Optional[str]]:
    if uploads_playlist_id:
        return {
            "youtube_channel_id": None,
            "channel_name": None,
            "channel_handle": handle,
            "uploads_playlist_id": uploads_playlist_id,
            "resolution_method": "uploads_playlist_id",
        }

    resolved_channel_id = channel_id or None
    channel_row: Optional[Dict] = None

    if not resolved_channel_id and handle:
        normalized_handle = str(handle).strip().replace("@", "")
        for candidate in (f"@{normalized_handle}", normalized_handle):
            channels_by_handle = youtube_fetch(
                "channels",
                {
                    "part": "snippet,statistics,contentDetails",
                    "forHandle": candidate,
                    "maxResults": "1",
                },
                api_key,
            )
            channel_row = (channels_by_handle.get("items") or [None])[0]
            if channel_row:
                resolved_channel_id = channel_row.get("id")
                break

        if not resolved_channel_id and allow_search_fallback:
            search = youtube_fetch(
                "search",
                {
                    "part": "snippet",
                    "type": "channel",
                    "q": handle,
                    "maxResults": "5",
                },
                api_key,
            )
            items = search.get("items") or []
            if items:
                resolved_channel_id = (((items[0] or {}).get("id") or {}).get("channelId")) or None

    if not resolved_channel_id:
        raise RuntimeError(
            "No se pudo resolver el canal con YouTube Data API oficial. "
            "Pasa --channel-id o --uploads-playlist-id, o usa --allow-search-fallback si necesitas search.list excepcionalmente."
        )

    if not channel_row:
        channels = youtube_fetch(
            "channels",
            {
                "part": "snippet,statistics,contentDetails",
                "id": resolved_channel_id,
                "maxResults": "1",
            },
            api_key,
        )
        channel_row = (channels.get("items") or [None])[0]

    row = channel_row
    if not row:
        raise RuntimeError("No se pudo resolver el canal en YouTube API")

    uploads = (((row.get("contentDetails") or {}).get("relatedPlaylists") or {}).get("uploads")) or None
    if not uploads:
        raise RuntimeError("No se pudo resolver uploads playlist para el canal")

    snippet = row.get("snippet") or {}
    return {
        "youtube_channel_id": row.get("id"),
        "channel_name": snippet.get("title"),
        "channel_handle": f"@{handle}" if handle and not str(handle).startswith("@") else handle,
        "uploads_playlist_id": uploads,
        "resolution_method": "channel_id" if channel_id else "forHandle" if handle else "unknown",
    }


def load_all_playlist_video_ids(api_key: str, uploads_playlist_id: str) -> List[str]:
    ids: List[str] = []
    token: Optional[str] = None

    while True:
        payload = youtube_fetch(
            "playlistItems",
            {
                "part": "snippet,contentDetails",
                "playlistId": uploads_playlist_id,
                "maxResults": "50",
                "pageToken": token or "",
            },
            api_key,
        )
        items = payload.get("items") or []
        for item in items:
            video_id = ((item.get("contentDetails") or {}).get("videoId")) or None
            if video_id:
                ids.append(video_id)

        token = payload.get("nextPageToken")
        if not token:
            break

    # Deduplicate preserving order.
    seen = set()
    unique_ids = []
    for video_id in ids:
        if video_id in seen:
            continue
        seen.add(video_id)
        unique_ids.append(video_id)
    return unique_ids


def load_video_details(api_key: str, video_ids: List[str]) -> List[Dict]:
    details: List[Dict] = []
    refreshed_at = datetime.now(timezone.utc)
    expires_at = refreshed_at + timedelta(days=30)

    for index in range(0, len(video_ids), 50):
        batch = video_ids[index : index + 50]
        payload = youtube_fetch(
            "videos",
            {
                "part": "snippet,statistics,contentDetails,recordingDetails,status",
                "id": ",".join(batch),
                "maxResults": str(len(batch)),
            },
            api_key,
        )
        items = payload.get("items") or []
        for item in items:
            snippet = item.get("snippet") or {}
            stats = item.get("statistics") or {}
            content = item.get("contentDetails") or {}
            recording = item.get("recordingDetails") or {}
            status = item.get("status") or {}
            recording_location = recording.get("location") or {}
            duration_seconds = parse_iso8601_duration_to_seconds(content.get("duration"))
            thumbs = snippet.get("thumbnails") or {}
            thumbnail_url = (
                ((thumbs.get("maxres") or {}).get("url"))
                or ((thumbs.get("standard") or {}).get("url"))
                or ((thumbs.get("high") or {}).get("url"))
                or ((thumbs.get("medium") or {}).get("url"))
                or ((thumbs.get("default") or {}).get("url"))
            )

            video_id = item.get("id")
            if not video_id:
                continue

            details.append(
                {
                    "video_id": video_id,
                    "video_url": f"https://www.youtube.com/watch?v={video_id}",
                    "title": snippet.get("title") or "Untitled video",
                    "description": snippet.get("description") or "",
                    "published_at": snippet.get("publishedAt"),
                    "view_count": int(stats["viewCount"]) if "viewCount" in stats else None,
                    "like_count": int(stats["likeCount"]) if "likeCount" in stats else None,
                    "comment_count": int(stats["commentCount"]) if "commentCount" in stats else None,
                    "duration_seconds": duration_seconds,
                    "is_short": is_short_video(
                        duration_seconds,
                        snippet.get("title") or "",
                        snippet.get("description") or "",
                    ),
                    "made_for_kids": (
                        bool(status.get("madeForKids"))
                        if isinstance(status.get("madeForKids"), bool)
                        else None
                    ),
                    "recording_lat": (
                        float(recording_location.get("latitude"))
                        if recording_location.get("latitude") is not None
                        else None
                    ),
                    "recording_lng": (
                        float(recording_location.get("longitude"))
                        if recording_location.get("longitude") is not None
                        else None
                    ),
                    "recording_location_description": recording.get("locationDescription"),
                    "thumbnail_url": thumbnail_url,
                    "youtube_data_refreshed_at": refreshed_at.isoformat(),
                    "youtube_data_expires_at": expires_at.isoformat(),
                }
            )

    # Keep original playlist order.
    order = {video_id: i for i, video_id in enumerate(video_ids)}
    details.sort(key=lambda row: order.get(str(row.get("video_id")), 10**9))
    return details


def parse_iso8601_duration_to_seconds(value: Optional[str]) -> Optional[int]:
    if not value or not isinstance(value, str) or not value.startswith("P"):
        return None

    match = re.match(
        r"P(?:(?P<years>\d+)Y)?(?:(?P<months>\d+)M)?(?:(?P<weeks>\d+)W)?(?:(?P<days>\d+)D)?(?:T(?:(?P<hours>\d+)H)?(?:(?P<minutes>\d+)M)?(?:(?P<seconds>\d+)S)?)?",
        value,
    )
    if not match:
        return None

    years = int(match.group("years") or 0)
    months = int(match.group("months") or 0)
    weeks = int(match.group("weeks") or 0)
    days = int(match.group("days") or 0)
    hours = int(match.group("hours") or 0)
    minutes = int(match.group("minutes") or 0)
    seconds = int(match.group("seconds") or 0)

    total = (
        years * 31_536_000
        + months * 2_592_000
        + weeks * 604_800
        + days * 86_400
        + hours * 3_600
        + minutes * 60
        + seconds
    )
    return total


def is_short_video(duration_seconds: Optional[int], title: str, description: str) -> bool:
    if isinstance(duration_seconds, int) and duration_seconds <= 60:
        return True
    text = f"{title} {description}".lower()
    return "#shorts" in text and isinstance(duration_seconds, int) and duration_seconds <= 90


def export_json(path: Path, rows: List[Dict], metadata: Dict) -> None:
    payload = {
        "extracted_at": datetime.now(timezone.utc).isoformat(),
        "metadata": metadata,
        "videos": rows,
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def export_csv(path: Path, rows: List[Dict]) -> None:
    fields = [
        "video_id",
        "video_url",
        "title",
        "description",
        "published_at",
        "duration_seconds",
        "is_short",
        "made_for_kids",
        "recording_lat",
        "recording_lng",
        "recording_location_description",
        "view_count",
        "like_count",
        "comment_count",
        "thumbnail_url",
        "youtube_data_refreshed_at",
        "youtube_data_expires_at",
    ]
    with path.open("w", encoding="utf-8", newline="") as fp:
        writer = csv.DictWriter(fp, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field) for field in fields})


def main() -> int:
    parser = argparse.ArgumentParser(description="Extract all videos from a YouTube channel")
    parser.add_argument("--handle", default="@luisitocomunica")
    parser.add_argument("--channel-id", default=None)
    parser.add_argument("--uploads-playlist-id", default=None)
    parser.add_argument("--out-dir", default="data/processed")
    parser.add_argument("--include-shorts", action="store_true", help="Incluye Shorts (por defecto se omiten).")
    parser.add_argument(
        "--allow-search-fallback",
        action="store_true",
        help="Permite usar search.list si forHandle/channel_id no resuelve. Es excepcional por cuota/compliance.",
    )
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    load_dotenv_local(repo_root)
    api_key = os.environ.get("YOUTUBE_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("Falta YOUTUBE_API_KEY en .env.local o entorno.")

    channel_id_from_handle_input = parse_channel_id(args.handle) if args.handle else None
    handle = None if channel_id_from_handle_input else parse_handle(args.handle) if args.handle else None
    channel_id = parse_channel_id(args.channel_id) if args.channel_id else channel_id_from_handle_input

    channel = resolve_channel(
        api_key=api_key,
        handle=handle,
        channel_id=channel_id,
        uploads_playlist_id=args.uploads_playlist_id,
        allow_search_fallback=bool(args.allow_search_fallback),
    )
    uploads_playlist_id = channel["uploads_playlist_id"] or ""
    if not uploads_playlist_id:
        raise RuntimeError("No se pudo resolver uploads playlist.")

    print(f"[extract] channel={channel.get('channel_name') or 'unknown'} uploads_playlist={uploads_playlist_id}")
    video_ids = load_all_playlist_video_ids(api_key, uploads_playlist_id)
    print(f"[extract] videos_found={len(video_ids)}")
    rows = load_video_details(api_key, video_ids)
    print(f"[extract] details_loaded={len(rows)}")
    if not args.include_shorts:
        total_before = len(rows)
        rows = [row for row in rows if not row.get("is_short")]
        print(f"[extract] shorts_filtered={total_before - len(rows)}")

    out_dir = repo_root / args.out_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    slug = (channel.get("channel_handle") or "@channel").replace("@", "").strip().lower() or "channel"
    json_path = out_dir / f"{slug}_videos.json"
    csv_path = out_dir / f"{slug}_videos.csv"

    export_json(
        json_path,
        rows,
        metadata={
            "youtube_channel_id": channel.get("youtube_channel_id"),
            "channel_name": channel.get("channel_name"),
            "channel_handle": channel.get("channel_handle"),
            "uploads_playlist_id": uploads_playlist_id,
            "resolution_method": channel.get("resolution_method"),
            "ingestion": "youtube_data_api_v3",
            "youtube_data_policy": "non_authorized_data_expires_within_30_days",
            "videos_count": len(rows),
            "shorts_included": bool(args.include_shorts),
        },
    )
    export_csv(csv_path, rows)

    print(f"[export] json={json_path}")
    print(f"[export] csv={csv_path}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"[error] {exc}", file=sys.stderr)
        raise

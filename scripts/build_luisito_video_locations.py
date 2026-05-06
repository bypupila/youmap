#!/usr/bin/env python3
"""
Build a map-ready dataset with one point per video for @luisitocomunica.

Input:
- data/processed/luisitocomunica_videos.json

Output:
- data/processed/luisitocomunica_video_locations.json
"""

from __future__ import annotations

import hashlib
import argparse
import json
import unicodedata
import urllib.request
from pathlib import Path
from typing import Dict, List, Optional, Tuple


DEFAULT_INPUT_PATH = Path("data/processed/luisitocomunica_videos.json")
DEFAULT_OUTPUT_PATH = Path("data/processed/luisitocomunica_video_locations.json")


def is_short_candidate(video: Dict) -> bool:
  if bool(video.get("is_short")):
    return True

  duration_seconds = video.get("duration_seconds")
  if isinstance(duration_seconds, (int, float)) and duration_seconds <= 60:
    return True

  title = str(video.get("title") or "").lower()
  description = str(video.get("description") or "").lower()
  if ("#shorts" in title or "#shorts" in description) and isinstance(duration_seconds, (int, float)) and duration_seconds <= 90:
    return True
  if "/shorts/" in description:
    return True

  return False


TRAVEL_KEYWORDS = [
  "travel",
  "trip",
  "viaje",
  "viajes",
  "turismo",
  "adventure",
  "aventura",
  "world",
  "road trip",
  "backpacking",
  "vacaciones",
  "vacation",
  "flight",
  "vuelo",
  "airport",
  "aeropuerto",
]


def travel_signals(video: Dict) -> Tuple[bool, float, List[str]]:
  title = str(video.get("title") or "")
  description = str(video.get("description") or "")
  merged = normalize(f"{title} {description}")
  signals: List[str] = []

  recording_lat = video.get("recording_lat")
  recording_lng = video.get("recording_lng")
  has_recording = isinstance(recording_lat, (int, float)) and isinstance(recording_lng, (int, float))
  if has_recording:
    signals.append("youtube_recording_details")

  keyword_hits = [kw for kw in TRAVEL_KEYWORDS if normalize(kw) in merged]
  if keyword_hits:
    signals.append("travel_keywords:" + ",".join(keyword_hits[:5]))

  score = 0.0
  if has_recording:
    score += 0.65
  if keyword_hits:
    score += 0.3
  score = min(1.0, score)
  return (has_recording or bool(keyword_hits), score, signals)


def normalize(text: str) -> str:
  value = unicodedata.normalize("NFD", text or "")
  value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
  return value.lower()


def fetch_countries() -> Dict[str, Dict]:
  url = "https://restcountries.com/v3.1/all?fields=cca2,name,translations,altSpellings,latlng"
  with urllib.request.urlopen(url, timeout=30) as response:
    payload = response.read().decode("utf-8")
  data = json.loads(payload)

  by_code: Dict[str, Dict] = {}
  for row in data:
    code = str(row.get("cca2") or "").upper()
    if len(code) != 2:
      continue

    name = row.get("name") or {}
    common_name = str(name.get("common") or code)
    latlng = row.get("latlng") or [0, 0]
    lat = float(latlng[0]) if len(latlng) > 0 else 0.0
    lng = float(latlng[1]) if len(latlng) > 1 else 0.0

    aliases = set()
    aliases.add(normalize(common_name))
    official = str(name.get("official") or "")
    if official:
      aliases.add(normalize(official))

    for alt in row.get("altSpellings") or []:
      if isinstance(alt, str):
        aliases.add(normalize(alt))

    translations = row.get("translations") or {}
    for translated in translations.values():
      if not isinstance(translated, dict):
        continue
      for key in ("common", "official"):
        raw = translated.get(key)
        if isinstance(raw, str) and raw.strip():
          aliases.add(normalize(raw))

    by_code[code] = {
      "country_code": code,
      "country_name": common_name,
      "lat": lat,
      "lng": lng,
      "aliases": {alias for alias in aliases if alias},
    }

  return by_code


def flag_to_country_code(value: str) -> Optional[str]:
  text = value or ""
  codepoints = [ord(ch) for ch in text]
  for i in range(len(codepoints) - 1):
    first = codepoints[i]
    second = codepoints[i + 1]
    base = 0x1F1E6
    if base <= first <= base + 25 and base <= second <= base + 25:
      return f"{chr(first - base + 65)}{chr(second - base + 65)}"
  return None


def build_alias_index(countries: Dict[str, Dict]) -> List[Tuple[str, str]]:
  pairs: List[Tuple[str, str]] = []
  for code, row in countries.items():
    for alias in row["aliases"]:
      # Drop very short aliases to reduce false positives.
      if len(alias) < 4:
        continue
      pairs.append((alias, code))
  # Prefer more specific names first.
  pairs.sort(key=lambda x: len(x[0]), reverse=True)
  return pairs


def infer_country_code(video: Dict, alias_index: List[Tuple[str, str]]) -> Tuple[str, str, float]:
  title = str(video.get("title") or "")
  description = str(video.get("description") or "")
  merged = f"{title} {description[:1800]}"

  from_flag = flag_to_country_code(merged)
  if from_flag:
    return from_flag, "flag_emoji", 0.95

  normalized = normalize(merged)
  padded = f" {normalized} "
  for alias, code in alias_index:
    token = f" {alias} "
    if token in padded:
      return code, "text_match", 0.72

  return "MX", "fallback_mx", 0.3


def jittered_coordinates(video_id: str, lat: float, lng: float) -> Tuple[float, float]:
  digest = hashlib.sha256(video_id.encode("utf-8")).hexdigest()
  a = int(digest[:8], 16) / 0xFFFFFFFF
  b = int(digest[8:16], 16) / 0xFFFFFFFF

  # Spread points around country centroid to avoid overlap.
  lat_offset = (a * 2 - 1) * 1.15
  lng_offset = (b * 2 - 1) * 1.15

  out_lat = max(min(lat + lat_offset, 85.0), -85.0)
  out_lng = lng + lng_offset
  if out_lng > 180:
    out_lng -= 360
  if out_lng < -180:
    out_lng += 360
  return out_lat, out_lng


def distance_sq(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
  return (lat1 - lat2) ** 2 + (lng1 - lng2) ** 2


def nearest_country_code(countries: Dict[str, Dict], lat: float, lng: float) -> Optional[str]:
  winner: Optional[str] = None
  best = float("inf")
  for code, row in countries.items():
    d = distance_sq(lat, lng, float(row["lat"]), float(row["lng"]))
    if d < best:
      best = d
      winner = code
  return winner


def main() -> None:
  parser = argparse.ArgumentParser(description="Build map-ready video locations from extracted YouTube dataset.")
  parser.add_argument("--input", default=str(DEFAULT_INPUT_PATH))
  parser.add_argument("--output", default=str(DEFAULT_OUTPUT_PATH))
  args = parser.parse_args()

  input_path = Path(args.input)
  output_path = Path(args.output)

  if not input_path.exists():
    raise FileNotFoundError(f"No existe {input_path}")

  raw = json.loads(input_path.read_text(encoding="utf-8"))
  videos: List[Dict] = raw.get("videos") or []
  if not videos:
    raise RuntimeError("Dataset de videos vacio")

  countries = fetch_countries()
  alias_index = build_alias_index(countries)

  output: List[Dict] = []
  for video in videos:
    video_id = str(video.get("video_id") or "").strip()
    if not video_id:
      continue
    if is_short_candidate(video):
      continue

    is_travel, travel_score, signals = travel_signals(video)
    if not is_travel:
      continue

    country_code, source, confidence = infer_country_code(video, alias_index)
    recording_lat = video.get("recording_lat")
    recording_lng = video.get("recording_lng")
    has_recording = isinstance(recording_lat, (int, float)) and isinstance(recording_lng, (int, float))
    if has_recording:
      nearest = nearest_country_code(countries, float(recording_lat), float(recording_lng))
      if nearest:
        country_code = nearest
        source = "youtube_recording_details"
        confidence = max(confidence, 0.95)

    country_row = countries.get(country_code) or {
      "country_code": country_code,
      "country_name": country_code,
      "lat": 23.6345,
      "lng": -102.5528,
    }
    if has_recording:
      lat = float(recording_lat)
      lng = float(recording_lng)
    else:
      lat, lng = jittered_coordinates(video_id, float(country_row["lat"]), float(country_row["lng"]))

    output.append(
      {
        "youtube_video_id": video_id,
        "video_url": video.get("video_url") or f"https://www.youtube.com/watch?v={video_id}",
        "title": video.get("title"),
        "description": video.get("description"),
        "thumbnail_url": video.get("thumbnail_url"),
        "published_at": video.get("published_at"),
        "view_count": video.get("view_count"),
        "like_count": video.get("like_count"),
        "comment_count": video.get("comment_count"),
        "duration_seconds": video.get("duration_seconds"),
        "is_short": False,
        "made_for_kids": video.get("made_for_kids"),
        "is_travel": True,
        "travel_score": round(float(travel_score), 3),
        "travel_signals": signals,
        "inclusion_reason": signals[0] if signals else "travel_keyword",
        "exclusion_reason": None,
        "recording_lat": float(recording_lat) if has_recording else None,
        "recording_lng": float(recording_lng) if has_recording else None,
        "recording_location_description": video.get("recording_location_description"),
        "travel_type": None,
        "country_code": country_row["country_code"],
        "country_name": country_row["country_name"],
        "location_label": country_row["country_name"],
        "lat": lat,
        "lng": lng,
        "confidence_score": round(confidence, 3),
        "location_source": source,
        "youtube_data_refreshed_at": video.get("youtube_data_refreshed_at"),
        "youtube_data_expires_at": video.get("youtube_data_expires_at"),
      }
    )

  output_path.parent.mkdir(parents=True, exist_ok=True)
  output_path.write_text(json.dumps(output, ensure_ascii=False), encoding="utf-8")

  print(f"[ok] output={output_path}")
  print(f"[ok] videos={len(output)}")


if __name__ == "__main__":
  main()

#!/usr/bin/env node

import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;
const datasetFiles = [
  "data/processed/luisitocomunica_videos.json",
  "data/processed/drewbinsky_videos.json",
  "data/processed/luisitocomunica_video_locations.json",
  "data/processed/drewbinsky_video_locations.json",
];

const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

async function readText(relativePath) {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath));
}

function rowsFromDataset(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.videos)) return payload.videos;
  return [];
}

function extractVideoIdFromWatchUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(String(value));
    if (url.hostname === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || "";
    if (url.searchParams.get("v")) return url.searchParams.get("v") || "";
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "embed" || parts[0] === "shorts") return parts[1] || "";
  } catch {
    return "";
  }
  return "";
}

function looksLikeShort(row) {
  if (row.is_short === true) return true;
  if (Number.isFinite(row.duration_seconds) && row.duration_seconds <= 60) return true;
  const text = `${row.title || ""} ${row.description || ""}`.toLowerCase();
  return text.includes("#shorts") && Number.isFinite(row.duration_seconds) && row.duration_seconds <= 90;
}

async function auditDataset(relativePath) {
  const payload = await readJson(relativePath);
  const rows = rowsFromDataset(payload);
  if (rows.length === 0) {
    fail(`${relativePath}: no videos found`);
    return;
  }

  const seen = new Set();
  let missingVideoUrl = 0;
  let missingMadeForKids = 0;

  for (const [index, row] of rows.entries()) {
    const videoId = String(row.youtube_video_id || row.video_id || "").trim();
    if (!videoIdPattern.test(videoId)) {
      fail(`${relativePath}[${index}]: invalid YouTube video ID '${videoId}'`);
      continue;
    }

    if (seen.has(videoId)) {
      fail(`${relativePath}: duplicate video ID '${videoId}'`);
    }
    seen.add(videoId);

    if (row.youtube_video_id && row.video_id && row.youtube_video_id !== row.video_id) {
      fail(`${relativePath}[${index}]: video_id and youtube_video_id disagree`);
    }

    if (looksLikeShort(row)) {
      fail(`${relativePath}[${index}]: Shorts must be excluded by default (${videoId})`);
    }

    if (row.video_url) {
      const urlVideoId = extractVideoIdFromWatchUrl(row.video_url);
      if (urlVideoId && urlVideoId !== videoId) {
        fail(`${relativePath}[${index}]: video_url points to '${urlVideoId}', expected '${videoId}'`);
      }
    } else {
      missingVideoUrl += 1;
    }

    if (!Object.prototype.hasOwnProperty.call(row, "made_for_kids")) {
      missingMadeForKids += 1;
    }
  }

  if (missingVideoUrl > 0) {
    warn(`${relativePath}: ${missingVideoUrl} row(s) rely on runtime video_url normalization from youtube_video_id`);
  }

  if (missingMadeForKids > 0) {
    warn(`${relativePath}: ${missingMadeForKids} row(s) do not carry made_for_kids yet; regenerate with the hardened extractor when API credentials are available`);
  }
}

async function listFiles(relativeDir, output = []) {
  const absoluteDir = path.join(repoRoot, relativeDir);
  for (const entry of await readdir(absoluteDir)) {
    if (entry === "node_modules" || entry === ".next" || entry === "output") continue;
    const relativePath = path.join(relativeDir, entry);
    const absolutePath = path.join(repoRoot, relativePath);
    const itemStat = await stat(absolutePath);
    if (itemStat.isDirectory()) {
      await listFiles(relativePath, output);
    } else if (/\.(tsx?|jsx?|mjs|cjs)$/.test(entry)) {
      output.push(relativePath);
    }
  }
  return output;
}

async function auditCode() {
  const player = await readText("src/components/map/youtube-embed-player.tsx");
  const utils = await readText("src/components/map/video-viewer-utils.ts");
  const globe = await readText("src/components/travel-globe.tsx");
  const nextConfig = await readText("next.config.mjs");
  const youtubePublic = await readText("src/lib/youtube-public.ts");

  if (player.includes("modestbranding")) {
    fail("YouTubeEmbedPlayer must not use deprecated modestbranding");
  }
  if (/autoplay\s*[:=]\s*1|autoplay=1/.test(player)) {
    fail("YouTubeEmbedPlayer must not enable autoplay");
  }
  if (!player.includes("getOfficialYouTubeEmbedPlayerVars")) {
    fail("YouTubeEmbedPlayer must use the shared official embed config helper");
  }
  if (!utils.includes("getOfficialYouTubeEmbedUrl") || !utils.includes("getOfficialYouTubeEmbedPlayerVars")) {
    fail("video-viewer-utils must expose official embed helpers");
  }
  if (/href=\{getYouTubeHref\(video\)/.test(globe) || /<a\s+href="\$\{href\}"/.test(globe)) {
    fail("TravelGlobe must not link video previews directly to YouTube watch URLs");
  }
  if (!nextConfig.includes("frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com")) {
    fail("CSP frame-src must allow the official YouTube embed hosts");
  }
  if (!/script-src[^`"\n]*https:\/\/www\.youtube\.com/.test(nextConfig)) {
    fail("CSP script-src must allow the official YouTube IFrame API host");
  }
  if (!nextConfig.includes("Referrer-Policy") || !nextConfig.includes("strict-origin-when-cross-origin")) {
    fail("Referrer-Policy must remain strict-origin-when-cross-origin for embeds");
  }
  if (!youtubePublic.includes("disabled in production")) {
    fail("youtube-public fallback must stay blocked in production");
  }

  const sourceFiles = await listFiles("src");
  for (const relativePath of sourceFiles) {
    if (relativePath === "src/lib/youtube-public.ts") continue;
    const text = await readText(relativePath);
    if (text.includes("@/lib/youtube-public") || text.includes("../lib/youtube-public")) {
      fail(`${relativePath}: production code must not import youtube-public scraping fallback`);
    }
  }
}

async function auditNeonByPupila() {
  if (!process.argv.includes("--check-neon-by-pupila")) return;
  if (!process.env.DATABASE_URL) {
    warn("Neon by.pupila audit skipped: DATABASE_URL is not set");
    return;
  }

  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`
    select
      c.id,
      c.channel_name,
      count(v.id)::int as total_videos,
      count(*) filter (where v.youtube_video_id !~ '^[A-Za-z0-9_-]{11}$')::int as invalid_ids,
      count(*) filter (
        where v.source_payload ->> 'ingestion' = 'youtube_data_api_v3'
          and v.made_for_kids is null
      )::int as missing_made_for_kids,
      count(*) filter (
        where v.youtube_data_expires_at is not null
          and v.youtube_data_expires_at <= now()
          and (
            coalesce(v.view_count, 0) > 0
            or v.like_count is not null
            or v.comment_count is not null
          )
      )::int as expired_stats
    from public.channels c
    inner join public.users u on u.id = c.user_id
    left join public.videos v on v.channel_id = c.id
    where lower(u.username) in ('bypupila', 'by.pupila')
       or lower(ltrim(coalesce(c.channel_handle, ''), '@')) in ('bypupila', 'by.pupila')
    group by c.id, c.channel_name
  `;

  if (rows.length === 0) {
    warn("Neon by.pupila audit found no matching channel");
    return;
  }

  for (const row of rows) {
    if (row.invalid_ids > 0) fail(`Neon ${row.channel_name}: ${row.invalid_ids} invalid YouTube IDs`);
    if (row.missing_made_for_kids > 0) fail(`Neon ${row.channel_name}: ${row.missing_made_for_kids} API videos missing made_for_kids`);
    if (row.expired_stats > 0) fail(`Neon ${row.channel_name}: ${row.expired_stats} videos have expired YouTube stats`);
  }
}

for (const datasetFile of datasetFiles) {
  await auditDataset(datasetFile);
}
await auditCode();
await auditNeonByPupila();

for (const message of warnings) {
  console.warn(`[youtube-embed-audit:warn] ${message}`);
}

if (failures.length > 0) {
  for (const message of failures) {
    console.error(`[youtube-embed-audit:fail] ${message}`);
  }
  process.exit(1);
}

console.log(`[youtube-embed-audit] ok datasets=${datasetFiles.length} warnings=${warnings.length}`);

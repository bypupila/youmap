#!/usr/bin/env node
/**
 * Seeds the `by.pupila` operator account against the connected Neon
 * database. The script is idempotent: running it twice updates the
 * existing user/channel and re-imports the catalog rather than creating
 * duplicates.
 *
 * Required env (read from `process.env`, never written to disk):
 *   - NEON_DATABASE_URL or DATABASE_URL: Postgres connection string.
 *   - BYPUPILA_SEED_PASSWORD: plain text password to hash for the user.
 *
 * Optional env:
 *   - BYPUPILA_SEED_EMAIL: defaults to "hola@by-pupila.com".
 *   - BYPUPILA_SEED_LIMIT: cap the number of videos imported (defaults
 *     to "all" — i.e. the full processed dataset).
 *
 * Usage:
 *   set -a && source /vercel/share/.env.project && set +a \
 *     && BYPUPILA_SEED_PASSWORD='...' node scripts/seed-bypupila.mjs
 */

import { neon } from "@neondatabase/serverless";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

const KEY_LENGTH = 64;

function hashPassword(password) {
  if (!password || String(password).length < 8) {
    throw new Error("BYPUPILA_SEED_PASSWORD is required and must be at least 8 characters.");
  }
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(String(password), salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derived}`;
}

function resolveDatabaseUrl() {
  const candidate =
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_POSTGRES_URL;
  if (!candidate) {
    throw new Error(
      "DATABASE_URL (or NEON_DATABASE_URL / POSTGRES_URL / NEON_POSTGRES_URL) must be set."
    );
  }
  return candidate;
}

async function main() {
  const password = process.env.BYPUPILA_SEED_PASSWORD;
  if (!password) {
    throw new Error("BYPUPILA_SEED_PASSWORD env var is required.");
  }

  const sql = neon(resolveDatabaseUrl());

  const username = "by.pupila";
  const email = (process.env.BYPUPILA_SEED_EMAIL || "hola@by-pupila.com").trim().toLowerCase();
  const displayName = "by.pupila";
  const youtubeChannelId = "UC_BYPUPILA_DEMO_001"; // synthetic — no real YT API call here
  const channelHandle = "@bypupila";
  const subscriberCount = 124000;
  const description = "Cartografia editorial de viajes y cultura, narrada por by.pupila.";
  const thumbnailUrl = "https://i.ytimg.com/vi/csfgZX_5BzQ/maxresdefault.jpg";

  // ---------------------------------------------------------------------- 1
  console.log("[seed-bypupila] upserting user...");
  const userIdRow = await sql`
    insert into public.users (id, username, email, display_name, avatar_url)
    values (gen_random_uuid(), ${username}, ${email}, ${displayName}, ${thumbnailUrl})
    on conflict (username) do update set
      email = excluded.email,
      display_name = excluded.display_name,
      avatar_url = excluded.avatar_url
    returning id
  `;
  const userId = userIdRow[0].id;
  console.log("    user id:", userId);

  // ---------------------------------------------------------------------- 2
  console.log("[seed-bypupila] writing credentials...");
  const passwordHash = hashPassword(password);
  await sql`
    insert into public.user_credentials (user_id, password_hash)
    values (${userId}, ${passwordHash})
    on conflict (user_id) do update set password_hash = excluded.password_hash
  `;

  // ---------------------------------------------------------------------- 3
  console.log("[seed-bypupila] upserting channel...");
  const channelRow = await sql`
    insert into public.channels (
      id, user_id, youtube_channel_id, channel_name, channel_handle,
      thumbnail_url, subscriber_count, description, is_public, last_synced_at
    )
    values (
      gen_random_uuid(), ${userId}, ${youtubeChannelId}, ${displayName},
      ${channelHandle}, ${thumbnailUrl}, ${subscriberCount}, ${description},
      true, now()
    )
    on conflict (user_id) do update set
      youtube_channel_id = excluded.youtube_channel_id,
      channel_name = excluded.channel_name,
      channel_handle = excluded.channel_handle,
      thumbnail_url = excluded.thumbnail_url,
      subscriber_count = excluded.subscriber_count,
      description = excluded.description,
      last_synced_at = excluded.last_synced_at
    returning id
  `;
  const channelId = channelRow[0].id;
  console.log("    channel id:", channelId);

  // ---------------------------------------------------------------------- 4
  console.log("[seed-bypupila] loading source dataset...");
  const datasetPath = resolve(rootDir, "data/processed/luisitocomunica_video_locations.json");
  const limitRaw = String(process.env.BYPUPILA_SEED_LIMIT || "").trim();
  const limit = limitRaw && /^\d+$/.test(limitRaw) ? Number(limitRaw) : null;
  const allRows = JSON.parse(readFileSync(datasetPath, "utf8"));
  const dataset = limit ? allRows.slice(0, limit) : allRows;
  console.log(`    source rows: ${allRows.length} | importing: ${dataset.length}`);

  // Wipe previous import so re-runs stay deterministic.
  await sql`delete from public.video_locations where channel_id = ${channelId}`;
  await sql`delete from public.videos where channel_id = ${channelId}`;

  let inserted = 0;
  let mapped = 0;
  let totalViews = 0n;
  for (const row of dataset) {
    const youtubeVideoId = String(row.youtube_video_id || "").trim();
    if (!youtubeVideoId) continue;

    const title = String(row.title || "Untitled");
    const desc = row.description || null;
    const thumb = row.thumbnail_url || null;
    const publishedAt = row.published_at || null;
    const viewCount = Number.isFinite(Number(row.view_count)) ? Number(row.view_count) : 0;
    totalViews += BigInt(viewCount);
    const travelType = row.travel_type || null;
    const lat = Number.isFinite(Number(row.lat)) ? Number(row.lat) : null;
    const lng = Number.isFinite(Number(row.lng)) ? Number(row.lng) : null;
    const countryCode = row.country_code ? String(row.country_code).toUpperCase() : null;
    const countryName = row.country_name || null;
    const locationLabel = row.location_label || countryName;
    const confidence = Number.isFinite(Number(row.confidence_score)) ? Number(row.confidence_score) : null;
    const locationSource = row.location_source || "text_match";
    const hasLocation = countryCode && lat !== null && lng !== null;

    const videoId = randomUUID();
    await sql`
      insert into public.videos (
        id, channel_id, youtube_video_id, title, description, thumbnail_url,
        published_at, view_count, is_short, is_travel,
        recording_lat, recording_lng, travel_type,
        location_status, verification_source, location_score
      )
      values (
        ${videoId}, ${channelId}, ${youtubeVideoId}, ${title}, ${desc}, ${thumb},
        ${publishedAt}, ${viewCount}, false, true,
        ${lat}, ${lng}, ${travelType},
        ${hasLocation ? "verified_auto" : "no_location"}, ${locationSource}, ${confidence}
      )
    `;
    inserted += 1;

    if (hasLocation) {
      await sql`
        insert into public.video_locations (
          channel_id, video_id, is_primary, country_code, country_name,
          location_label, lat, lng, confidence_score, source
        )
        values (
          ${channelId}, ${videoId}, true, ${countryCode}, ${countryName},
          ${locationLabel}, ${lat}, ${lng}, ${confidence}, ${locationSource}
        )
      `;
      mapped += 1;
    }
  }
  console.log(`    inserted videos: ${inserted} | with location: ${mapped} | total views: ${totalViews}`);

  // ---------------------------------------------------------------------- 5
  console.log("[seed-bypupila] writing channel metrics snapshot...");
  const distinctCountriesRow = await sql`
    select count(distinct country_code) as c
    from public.video_locations
    where channel_id = ${channelId}
  `;
  const totalCountries = Number(distinctCountriesRow[0]?.c || 0);
  const metricMonth = new Date().toISOString().slice(0, 7) + "-01";
  await sql`
    insert into public.channel_monthly_metrics (
      channel_id, metric_month, total_countries, total_mapped_videos, total_views, monthly_visitors
    )
    values (${channelId}, ${metricMonth}, ${totalCountries}, ${mapped}, ${Number(totalViews)}, 18450)
    on conflict (channel_id, metric_month) do update set
      total_countries = excluded.total_countries,
      total_mapped_videos = excluded.total_mapped_videos,
      total_views = excluded.total_views,
      monthly_visitors = excluded.monthly_visitors
  `;

  // ---------------------------------------------------------------------- 6
  console.log("[seed-bypupila] marking onboarding complete...");
  await sql`
    insert into public.onboarding_state (user_id, current_step, is_complete, channel_id, selected_plan, last_seen_at)
    values (${userId}, 'completed', true, ${channelId}, 'creator', now())
    on conflict (user_id) do update set
      current_step = excluded.current_step,
      is_complete = excluded.is_complete,
      channel_id = excluded.channel_id,
      selected_plan = excluded.selected_plan,
      last_seen_at = excluded.last_seen_at
  `;

  console.log("[seed-bypupila] done.");
  console.log({
    username,
    email,
    publicProfile: `/u/${username}`,
    videos: inserted,
    mapped,
    countries: totalCountries,
  });
}

main().catch((error) => {
  console.error("[seed-bypupila] failed:", error);
  process.exit(1);
});

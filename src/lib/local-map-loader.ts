import { readFile } from "fs/promises";
import path from "path";
import { z } from "zod";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";
import luisitoLocationsJson from "../../data/processed/luisitocomunica_video_locations.json";
import drewLocationsJson from "../../data/processed/drewbinsky_video_locations.json";

const locationSchema = z.object({
  youtube_video_id: z.string(),
  video_url: z.string().optional().nullable(),
  title: z.string(),
  description: z.string().optional().nullable(),
  thumbnail_url: z.string().optional().nullable(),
  published_at: z.string().optional().nullable(),
  view_count: z.number().optional().nullable(),
  like_count: z.number().optional().nullable(),
  comment_count: z.number().optional().nullable(),
  duration_seconds: z.number().optional().nullable(),
  is_short: z.boolean().optional().nullable(),
  is_travel: z.boolean().optional().nullable(),
  travel_score: z.number().optional().nullable(),
  travel_signals: z.array(z.string()).optional().nullable(),
  inclusion_reason: z.string().optional().nullable(),
  exclusion_reason: z.string().optional().nullable(),
  recording_lat: z.number().optional().nullable(),
  recording_lng: z.number().optional().nullable(),
  recording_location_description: z.string().optional().nullable(),
  travel_type: z.string().optional().nullable(),
  country_code: z.string().length(2),
  country_name: z.string().optional().nullable(),
  location_label: z.string().optional().nullable(),
  lat: z.number(),
  lng: z.number(),
  confidence_score: z.number().optional().nullable(),
});

const locationsSchema = z.array(locationSchema);

function isShortCandidate(row: {
  title?: string | null;
  description?: string | null;
  duration_seconds?: number | null;
  is_short?: boolean | null;
}) {
  if (row.is_short) return true;
  if (typeof row.duration_seconds === "number" && Number.isFinite(row.duration_seconds) && row.duration_seconds <= 60) {
    return true;
  }
  const title = String(row.title || "").toLowerCase();
  const description = String(row.description || "").toLowerCase();
  return (title.includes("#shorts") || description.includes("#shorts")) && typeof row.duration_seconds === "number" && row.duration_seconds <= 90;
}

interface LocalMapLoaderInput {
  fileName: string;
  channel: TravelChannel;
}

function getEmbeddedMapRows(fileName: string): unknown[] | null {
  if (fileName === "luisitocomunica_video_locations.json") {
    return luisitoLocationsJson as unknown[];
  }
  if (fileName === "drewbinsky_video_locations.json") {
    return drewLocationsJson as unknown[];
  }
  return null;
}

export async function loadLocalMapData({ fileName, channel }: LocalMapLoaderInput): Promise<{
  channel: TravelChannel;
  videoLocations: TravelVideoLocation[];
}> {
  const embeddedRows = getEmbeddedMapRows(fileName);
  const rawRows =
    embeddedRows ||
    JSON.parse(
      await readFile(path.join(process.cwd(), "data", "processed", fileName), "utf8")
    );
  const parsed = locationsSchema
    .parse(rawRows)
    .filter((row) => !isShortCandidate(row))
    .filter((row) => row.is_travel !== false);

  return {
    channel,
    videoLocations: parsed,
  };
}

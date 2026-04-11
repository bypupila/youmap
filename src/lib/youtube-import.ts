import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase-service";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";
import { geocodeLocation } from "@/lib/geocode";
import { getGeminiClient, getGeminiModel } from "@/lib/gemini";
import { LOCATION_PROMPT } from "@/lib/youtube-location-prompt";
import { loadUploadsPlaylistVideos, loadVideoDetails, resolveYouTubeChannel } from "@/lib/youtube";

const travelTypeSchema = z.enum(["city_tour", "nature", "food", "culture", "adventure", "beach", "road_trip", "other"]);

const locationSchema = z
  .object({
    country_code: z.string().length(2).optional().nullable(),
    country_name: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    region: z.string().optional().nullable(),
    location_label: z.string().optional().nullable(),
    confidence: z.number().min(0).max(1).optional().nullable(),
    travel_type: travelTypeSchema.optional().nullable(),
  })
  .passthrough();

const extractionSchema = z
  .object({
    has_location: z.boolean(),
    primary_location: locationSchema.optional().nullable(),
    additional_locations: z.array(locationSchema).optional().default([]),
    summary: z.string().optional().nullable(),
  })
  .passthrough();

const geminiJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    has_location: { type: "boolean" },
    primary_location: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: {
        country_code: { type: ["string", "null"] },
        country_name: { type: ["string", "null"] },
        city: { type: ["string", "null"] },
        region: { type: ["string", "null"] },
        location_label: { type: ["string", "null"] },
        confidence: { type: ["number", "null"] },
        travel_type: { type: ["string", "null"] },
      },
      required: [],
    },
    additional_locations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          country_code: { type: ["string", "null"] },
          country_name: { type: ["string", "null"] },
          city: { type: ["string", "null"] },
          region: { type: ["string", "null"] },
          location_label: { type: ["string", "null"] },
          confidence: { type: ["number", "null"] },
          travel_type: { type: ["string", "null"] },
        },
        required: [],
      },
    },
    summary: { type: ["string", "null"] },
  },
  required: ["has_location", "additional_locations"],
} as const;

interface ImportYoutubeChannelInput {
  userId: string;
  channelUrl: string;
  service?: SupabaseClient;
}

export interface ImportYoutubeChannelResult {
  import_run_id: string;
  channel: TravelChannel;
  videoLocations: TravelVideoLocation[];
  importedVideos: number;
  mappedVideos: number;
  skippedVideos: number;
  preview_session_id?: string;
  preview_mode?: boolean;
  channelSource: {
    youtube_channel_id: string;
    channel_name: string;
    channel_handle: string | null;
    uploads_playlist_id: string;
  };
}

async function upsertExtractionRun(service: SupabaseClient, input: {
  channelId: string;
  videoId: string;
  status: string;
  promptVersion: string;
  model: string | null;
  inputPayload: Record<string, unknown>;
  outputPayload: Record<string, unknown>;
  errorMessage?: string | null;
  attempts?: number;
  startedAt?: string | null;
  finishedAt?: string | null;
}) {
  const { data: existing } = await service
    .from("location_extraction_runs")
    .select("id")
    .eq("video_id", input.videoId)
    .maybeSingle();

  const payload = {
    channel_id: input.channelId,
    video_id: input.videoId,
    status: input.status,
    prompt_version: input.promptVersion,
    model: input.model,
    input: input.inputPayload,
    output: input.outputPayload,
    error_message: input.errorMessage || null,
    attempts: input.attempts ?? 1,
    started_at: input.startedAt || null,
    finished_at: input.finishedAt || null,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    await service.from("location_extraction_runs").update(payload).eq("id", existing.id);
    return existing.id as string;
  }

  const { data, error } = await service.from("location_extraction_runs").insert(payload).select("id").single();
  if (error || !data) {
    throw new Error(error?.message || "Could not create extraction run");
  }

  return data.id as string;
}

async function extractLocationForVideo(channel: { channel_name: string; description: string | null }, video: {
  title: string;
  description: string | null;
  published_at: string | null;
  youtube_video_id: string;
}) {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: getGeminiModel(),
    contents: `${LOCATION_PROMPT}

Channel: ${channel.channel_name}
Channel description: ${channel.description || "No description"}
Video title: ${video.title}
Video description: ${(video.description || "").slice(0, 5000)}
Published at: ${video.published_at || "unknown"}

Return the location data only. If there are several places, focus on the main filming destination.`,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: geminiJsonSchema,
    },
  });

  const parsed = extractionSchema.parse(JSON.parse(response.text || "{}"));
  return parsed;
}

function createGeoQuery(primaryLocation: z.infer<typeof locationSchema>) {
  return [primaryLocation.location_label, primaryLocation.city, primaryLocation.region, primaryLocation.country_name]
    .filter(Boolean)
    .join(", ");
}

function toTravelVideoLocation(input: {
  youtubeVideoId: string;
  title: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
  viewCount: number | null;
  location: z.infer<typeof locationSchema>;
  geo: Awaited<ReturnType<typeof geocodeLocation>>;
}): TravelVideoLocation | null {
  if (!input.geo) return null;

  return {
    youtube_video_id: input.youtubeVideoId,
    title: input.title,
    thumbnail_url: input.thumbnailUrl,
    published_at: input.publishedAt,
    view_count: input.viewCount,
    travel_type: input.location.travel_type || null,
    country_code: input.geo.countryCode || input.location.country_code || "XX",
    country_name: input.geo.countryName || input.location.country_name || input.geo.countryCode || "Unknown",
    location_label: input.location.location_label || input.geo.label,
    lat: input.geo.lat,
    lng: input.geo.lng,
    confidence_score: input.location.confidence ?? null,
  };
}

async function processVideosInBatches<T, R>(items: T[], concurrency: number, worker: (item: T, index: number) => Promise<R>) {
  const results: R[] = [];
  let index = 0;

  const runners = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current], current);
    }
  });

  await Promise.all(runners);
  return results;
}

function filterOutShortPlaylistItems<T extends { contentDetails?: { videoId?: string } }>(
  playlistItems: T[],
  detailsByVideoId: Map<string, { is_short?: boolean }>
) {
  return playlistItems.filter((item) => {
    const videoId = item.contentDetails?.videoId;
    if (!videoId) return false;
    const details = detailsByVideoId.get(videoId);
    return !details?.is_short;
  });
}

export async function importYoutubeChannelPreview(channelUrl: string): Promise<ImportYoutubeChannelResult> {
  const source = await resolveYouTubeChannel(channelUrl);
  const channelId = randomUUID();
  const userId = randomUUID();
  const importRunId = randomUUID();

  const playlistVideos = await loadUploadsPlaylistVideos(source.uploads_playlist_id);
  const videoIds = playlistVideos.map((video) => video.contentDetails?.videoId).filter(Boolean) as string[];
  const videoDetails = videoIds.length ? await loadVideoDetails(videoIds) : new Map();
  const eligiblePlaylistVideos = filterOutShortPlaylistItems(playlistVideos, videoDetails);

  const extractedLocations = await processVideosInBatches(eligiblePlaylistVideos, 3, async (playlistItem) => {
    const videoId = playlistItem.contentDetails?.videoId;
    if (!videoId) return null;

    const details = videoDetails.get(videoId);
    const title = details?.title || playlistItem.snippet?.title || "Untitled video";
    const description = details?.description || playlistItem.snippet?.description || null;
    const thumbnailUrl =
      details?.thumbnail_url ||
      playlistItem.snippet?.thumbnails?.high?.url ||
      playlistItem.snippet?.thumbnails?.medium?.url ||
      playlistItem.snippet?.thumbnails?.default?.url ||
      null;
    const publishedAt = details?.published_at || playlistItem.snippet?.publishedAt || playlistItem.contentDetails?.videoPublishedAt || null;
    const viewCount = details?.view_count ?? null;

    const extraction = await extractLocationForVideo(
      { channel_name: source.channel_name, description: source.description },
      {
        title,
        description,
        published_at: publishedAt,
        youtube_video_id: videoId,
      }
    );

    if (!extraction.has_location || !extraction.primary_location) {
      return null;
    }

    const geo = await geocodeLocation(createGeoQuery(extraction.primary_location));
    if (!geo) {
      return null;
    }

    return toTravelVideoLocation({
      youtubeVideoId: videoId,
      title,
      thumbnailUrl,
      publishedAt,
      viewCount,
      location: extraction.primary_location,
      geo,
    });
  });

  const videoLocations = extractedLocations.filter(Boolean) as TravelVideoLocation[];
  const importedVideos = eligiblePlaylistVideos.length;

  return {
    import_run_id: importRunId,
    preview_mode: true,
    channel: {
      id: channelId,
      user_id: userId,
      channel_name: source.channel_name,
      channel_handle: source.channel_handle,
      thumbnail_url: source.thumbnail_url,
      subscriber_count: source.subscriber_count,
    },
    videoLocations,
    importedVideos,
    mappedVideos: videoLocations.length,
    skippedVideos: importedVideos - videoLocations.length,
    channelSource: {
      youtube_channel_id: source.youtube_channel_id,
      channel_name: source.channel_name,
      channel_handle: source.channel_handle,
      uploads_playlist_id: source.uploads_playlist_id,
    },
  };
}

export async function importYoutubeChannel({
  userId,
  channelUrl,
  service = createServiceRoleClient(),
}: ImportYoutubeChannelInput): Promise<ImportYoutubeChannelResult> {
  const importRunId = randomUUID();
  const startedAt = new Date().toISOString();

  try {
    const source = await resolveYouTubeChannel(channelUrl);
    const { data: channelRow, error: channelError } = await service
      .from("channels")
      .upsert(
        {
          user_id: userId,
          youtube_channel_id: source.youtube_channel_id,
          channel_name: source.channel_name,
          channel_handle: source.channel_handle,
          thumbnail_url: source.thumbnail_url,
          subscriber_count: source.subscriber_count,
          description: source.description,
          is_public: true,
          published_at: source.published_at,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select("id,user_id,channel_name,channel_handle,thumbnail_url,subscriber_count,description")
      .single();

    if (channelError || !channelRow) {
      throw new Error(channelError?.message || "Could not save channel");
    }

    const uploadChannel = channelRow as {
      id: string;
      user_id: string;
      channel_name: string;
      channel_handle: string | null;
      thumbnail_url: string | null;
      subscriber_count: number | null;
      description: string | null;
    };

    await service.from("channel_import_runs").insert({
      id: importRunId,
      channel_id: uploadChannel.id,
      status: "running",
      source: "youtube",
      input: { channelUrl },
      output: {},
      started_at: startedAt,
      updated_at: startedAt,
    });

    const playlistVideos = await loadUploadsPlaylistVideos(source.uploads_playlist_id);
    const videoIds = playlistVideos.map((video) => video.contentDetails?.videoId).filter(Boolean) as string[];
    const videoDetails = videoIds.length ? await loadVideoDetails(videoIds) : new Map();
    const eligiblePlaylistVideos = filterOutShortPlaylistItems(playlistVideos, videoDetails);
    const eligibleVideoCount = eligiblePlaylistVideos.length;

    await processVideosInBatches(eligiblePlaylistVideos, 3, async (playlistItem) => {
      const videoId = playlistItem.contentDetails?.videoId;
      if (!videoId) return null;

      const details = videoDetails.get(videoId);
      const title = details?.title || playlistItem.snippet?.title || "Untitled video";
      const description = details?.description || playlistItem.snippet?.description || null;
      const thumbnailUrl = details?.thumbnail_url || playlistItem.snippet?.thumbnails?.high?.url || playlistItem.snippet?.thumbnails?.medium?.url || playlistItem.snippet?.thumbnails?.default?.url || null;
      const publishedAt = details?.published_at || playlistItem.snippet?.publishedAt || playlistItem.contentDetails?.videoPublishedAt || null;
      const viewCount = details?.view_count ?? null;

      const { data: videoRow, error: videoError } = await service
        .from("videos")
        .upsert(
          {
            channel_id: uploadChannel.id,
            youtube_video_id: videoId,
            title,
            description,
            thumbnail_url: thumbnailUrl,
            published_at: publishedAt,
            view_count: viewCount ?? 0,
            like_count: details?.like_count ?? null,
            comment_count: details?.comment_count ?? null,
            travel_type: null,
            location_status: "processing",
            source_payload: {
              playlist_item: playlistItem,
              video_details: details?.raw || null,
            },
            updated_at: new Date().toISOString(),
          },
          { onConflict: "channel_id,youtube_video_id" }
        )
        .select("id")
        .single();

      if (videoError || !videoRow) {
        throw new Error(videoError?.message || `Could not persist video ${videoId}`);
      }

      const videoRecordId = videoRow.id as string;
      const now = new Date().toISOString();

      const extraction = await extractLocationForVideo(
        { channel_name: uploadChannel.channel_name, description: uploadChannel.description },
        {
          title,
          description,
          published_at: publishedAt,
          youtube_video_id: videoId,
        }
      );

      if (!extraction.has_location || !extraction.primary_location) {
        await service
          .from("videos")
          .update({
            travel_type: null,
            location_status: "no_location",
            updated_at: now,
          })
          .eq("id", videoRecordId);

        await upsertExtractionRun(service, {
          channelId: uploadChannel.id,
          videoId: videoRecordId,
          status: "completed",
          promptVersion: "gemini-v1",
          model: getGeminiModel(),
          inputPayload: {
            channel: source,
            video: { title, description, publishedAt, videoId },
          },
          outputPayload: extraction,
          startedAt: now,
          finishedAt: now,
        });

        return null;
      }

      const geo = await geocodeLocation(createGeoQuery(extraction.primary_location));
      if (!geo) {
        await service
          .from("videos")
          .update({
            travel_type: extraction.primary_location.travel_type || null,
            location_status: "failed",
            updated_at: now,
          })
          .eq("id", videoRecordId);

        await upsertExtractionRun(service, {
          channelId: uploadChannel.id,
          videoId: videoRecordId,
          status: "failed",
          promptVersion: "gemini-v1",
          model: getGeminiModel(),
          inputPayload: {
            channel: source,
            video: { title, description, publishedAt, videoId },
          },
          outputPayload: extraction,
          errorMessage: "Geocoding failed",
          startedAt: now,
          finishedAt: now,
        });

        return null;
      }

      const primaryLocation = toTravelVideoLocation({
        youtubeVideoId: videoId,
        title,
        thumbnailUrl,
        publishedAt,
        viewCount,
        location: extraction.primary_location,
        geo,
      });

      if (!primaryLocation) return null;

      await service.from("video_locations").delete().eq("video_id", videoRecordId);
      await service.from("video_locations").insert({
        id: randomUUID(),
        channel_id: uploadChannel.id,
        video_id: videoRecordId,
        is_primary: true,
        country_code: primaryLocation.country_code,
        country_name: primaryLocation.country_name,
        location_label: primaryLocation.location_label,
        city: extraction.primary_location.city || geo.city,
        region: extraction.primary_location.region || geo.region,
        lat: primaryLocation.lat,
        lng: primaryLocation.lng,
        confidence_score: primaryLocation.confidence_score,
        travel_type: primaryLocation.travel_type,
        source: "gemini",
        raw_payload: {
          gemini: extraction,
          geocode: geo.raw,
        },
      });

      for (const extra of extraction.additional_locations) {
        const extraGeo = await geocodeLocation(createGeoQuery(extra));
        if (!extraGeo) continue;

        await service.from("video_locations").insert({
          id: randomUUID(),
          channel_id: uploadChannel.id,
          video_id: videoRecordId,
          is_primary: false,
          country_code: extraGeo.countryCode || extra.country_code || "XX",
          country_name: extraGeo.countryName || extra.country_name || "Unknown",
          location_label: extra.location_label || extraGeo.label,
          city: extra.city || extraGeo.city,
          region: extra.region || extraGeo.region,
          lat: extraGeo.lat,
          lng: extraGeo.lng,
          confidence_score: extra.confidence ?? null,
          travel_type: extra.travel_type || null,
          source: "gemini",
          raw_payload: {
            gemini: extraction,
            geocode: extraGeo.raw,
          },
        });
      }

      await service
        .from("videos")
        .update({
          travel_type: primaryLocation.travel_type || null,
          location_status: "mapped",
          updated_at: now,
        })
        .eq("id", videoRecordId);

      await upsertExtractionRun(service, {
        channelId: uploadChannel.id,
        videoId: videoRecordId,
        status: "completed",
        promptVersion: "gemini-v1",
        model: getGeminiModel(),
        inputPayload: {
          channel: source,
          video: { title, description, publishedAt, videoId },
        },
        outputPayload: {
          gemini: extraction,
          geocode: geo.raw,
        },
        startedAt: now,
        finishedAt: now,
      });

      return primaryLocation;
    });

    const allLocations = await service
      .from("video_locations")
      .select(
        `
        country_code,
        country_name,
        location_label,
        lat,
        lng,
        confidence_score,
        travel_type,
        videos!inner(
          youtube_video_id,
          title,
          description,
          thumbnail_url,
          published_at,
          view_count
        )
      `
      )
      .eq("channel_id", uploadChannel.id)
      .eq("is_primary", true)
      .order("created_at", { ascending: false });

    const normalizedLocations = ((allLocations.data || []) as Array<{
      country_code: string;
      country_name: string | null;
      location_label: string | null;
      lat: number | string;
      lng: number | string;
      confidence_score: number | string | null;
      travel_type: string | null;
      videos: Array<{
        youtube_video_id: string;
        title: string;
        description: string | null;
        thumbnail_url: string | null;
        published_at: string | null;
        view_count: number | string | null;
      }>;
    }>)
      .map((row) => {
        const video = row.videos?.[0];
        if (!video) return null;

        return {
          youtube_video_id: video.youtube_video_id,
          title: video.title,
          description: video.description,
          thumbnail_url: video.thumbnail_url,
          published_at: video.published_at,
          view_count: Number(video.view_count || 0),
          travel_type: row.travel_type,
          country_code: row.country_code,
          country_name: row.country_name || row.country_code,
          location_label: row.location_label,
          lat: Number(row.lat),
          lng: Number(row.lng),
          confidence_score: Number(row.confidence_score || 0),
        } satisfies TravelVideoLocation;
      })
      .filter(Boolean) as TravelVideoLocation[];

    const channel: TravelChannel = {
      id: uploadChannel.id,
      user_id: uploadChannel.user_id,
      channel_name: uploadChannel.channel_name,
      channel_handle: uploadChannel.channel_handle,
      thumbnail_url: uploadChannel.thumbnail_url,
      subscriber_count: uploadChannel.subscriber_count,
    };

    const skippedVideos = eligibleVideoCount - normalizedLocations.length;

    await service
      .from("channel_import_runs")
      .update({
        status: "completed",
        output: {
          importedVideos: eligibleVideoCount,
          mappedVideos: normalizedLocations.length,
          skippedVideos,
          channel: source,
        },
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", importRunId);

    await service.from("onboarding_state").upsert(
      {
        user_id: userId,
        current_step: "plan",
        completed_steps: ["welcome", "youtube"],
        youtube_channel_id: source.youtube_channel_id,
        channel_id: uploadChannel.id,
        is_complete: false,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    return {
      import_run_id: importRunId,
      channel,
      videoLocations: normalizedLocations,
      importedVideos: eligibleVideoCount,
      mappedVideos: normalizedLocations.length,
      skippedVideos,
      channelSource: {
        youtube_channel_id: source.youtube_channel_id,
        channel_name: source.channel_name,
        channel_handle: source.channel_handle,
        uploads_playlist_id: source.uploads_playlist_id,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown import error";
    await service
      .from("channel_import_runs")
      .update({
        status: "failed",
        error_message: errorMessage,
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", importRunId);
    throw error;
  }
}

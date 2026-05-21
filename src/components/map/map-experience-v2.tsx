"use client";

import { MapExperienceCore } from "@/components/map/map-experience-core";
import type { FanVoteOptionInput } from "@/lib/fan-vote-options";
import type { MapFanVoteSummary } from "@/lib/map-fan-votes";
import type { ManualVerificationItem, MapSummary } from "@/lib/map-data";
import type { MapPollRecord } from "@/lib/map-polls";
import type { MapRailSponsor, MapViewerContext } from "@/lib/map-public";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";

type MapViewMode = "viewer" | "creator";

interface PollOptionInput {
  country_code: string;
  country_name: string;
  sort_order: number;
  cities: Array<{ city: string; sort_order: number }>;
}

interface MapExperienceV2Props {
  channel: TravelChannel;
  videoLocations: TravelVideoLocation[];
  manualQueue?: ManualVerificationItem[];
  summary?: MapSummary | null;
  channelId?: string | null;
  allowRefresh?: boolean;
  showLegend?: boolean;
  showOperationsPanel?: boolean;
  showActiveVideoCard?: boolean;
  interactive?: boolean;
  showHeader?: boolean;
  viewer?: MapViewerContext;
  sponsors?: MapRailSponsor[];
  activePoll?: MapPollRecord | null;
  fanVotes?: MapFanVoteSummary | null;
  availablePollOptions?: PollOptionInput[];
  fanVoteOptions?: FanVoteOptionInput[];
  headerEyebrow?: string;
  viewMode?: MapViewMode;
  isDemoMode?: boolean;
  layoutVariant?: "full";
}

function resolveViewMode({
  viewer,
  viewMode,
  isDemoMode,
}: Pick<MapExperienceV2Props, "viewer" | "viewMode" | "isDemoMode">): MapViewMode {
  if (isDemoMode) return "viewer";
  if (viewer?.isOwner || viewer?.role === "creator" || viewer?.role === "superadmin") return "creator";
  return viewMode || "viewer";
}

export function MapExperienceV2({
  channel,
  videoLocations,
  viewer,
  viewMode,
  isDemoMode = false,
}: MapExperienceV2Props) {
  const resolvedViewMode = resolveViewMode({ viewer, viewMode, isDemoMode });
  return (
    <MapExperienceCore
      channel={channel}
      videoLocations={videoLocations}
      viewMode={resolvedViewMode}
      isDemoMode={isDemoMode}
    />
  );
}

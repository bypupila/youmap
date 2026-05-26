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
  forceViewerMode?: boolean;
  layoutVariant?: "full";
}

function resolveViewMode({
  viewer,
  viewMode,
  forceViewerMode,
}: Pick<MapExperienceV2Props, "viewer" | "viewMode" | "isDemoMode" | "forceViewerMode">): MapViewMode {
  if (forceViewerMode) return "viewer";
  if (viewMode) return viewMode;
  if (viewer?.isOwner || viewer?.role === "creator" || viewer?.role === "superadmin") return "creator";
  return "viewer";
}

export function MapExperienceV2({
  channel,
  videoLocations,
  sponsors = [],
  viewer,
  viewMode,
  isDemoMode = false,
  forceViewerMode = false,
}: MapExperienceV2Props) {
  const resolvedViewMode = resolveViewMode({ viewer, viewMode, isDemoMode, forceViewerMode });
  return (
    <MapExperienceCore
      channel={channel}
      videoLocations={videoLocations}
      sponsors={sponsors}
      viewMode={resolvedViewMode}
      isDemoMode={isDemoMode}
    />
  );
}

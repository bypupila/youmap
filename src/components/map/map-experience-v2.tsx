"use client";

import { MapProposalPrototype2 } from "@/components/map/map-proposal-prototype-2";
import type { FanVoteOptionInput } from "@/lib/fan-vote-options";
import type { MapFanVoteSummary } from "@/lib/map-fan-votes";
import type { ManualVerificationItem, MapSummary } from "@/lib/map-data";
import type { MapPollRecord } from "@/lib/map-polls";
import type { MapRailSponsor, MapViewerContext } from "@/lib/map-public";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";

type MapViewMode = "viewer" | "creator" | "demo";

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
  layoutVariant?: "full";
}

export function MapExperienceV2({ channel, videoLocations, viewMode = "viewer" }: MapExperienceV2Props) {
  return <MapProposalPrototype2 channel={channel} videoLocations={videoLocations} viewMode={viewMode} />;
}

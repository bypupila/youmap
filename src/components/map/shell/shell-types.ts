import type { Dispatch, RefObject, SetStateAction } from "react";
import type { ManualVerificationItem, MapSummary } from "@/lib/map-data";
import type { MapPollRecord } from "@/lib/map-polls";
import type { MapRailSponsor, MapViewerContext } from "@/lib/map-public";
import type { TravelChannel, TravelVideoLocation } from "@/lib/types";
import type { CountryBucket, DestinationCandidate } from "@/components/map/lib/aggregations";

export type FilterWindow = "30" | "90" | "365" | "all";
export type SyncState = "idle" | "running" | "success" | "error";

export type SyncSummary = {
  videos_scanned: number;
  videos_extracted: number;
  videos_verified_auto: number;
  videos_needs_manual: number;
  videos_verified_manual: number;
  excluded_shorts: number;
  excluded_non_travel: number;
};

export type PollOptionInput = {
  country_code: string;
  country_name: string;
  sort_order: number;
  cities: Array<{ city: string; sort_order: number }>;
};

/**
 * Everything both shells need to render — derived data, callbacks, refs and
 * setters live here so the shell components stay presentational. Anything
 * stateful is owned by `<MapExperience>` and threaded down via this object.
 */
export type MapShellProps = {
  channel: TravelChannel;
  channelId: string | null;
  viewer: MapViewerContext;
  youtubeUrl: string | null;
  mapUrl: string;
  resolvedSummary: MapSummary;
  cityCount: number;
  pendingManual: ManualVerificationItem[];
  pollState: MapPollRecord | null;
  sponsors: MapRailSponsor[];
  countryBuckets: CountryBucket[];
  selectedCountryCode: string | null;
  selectedCountryName: string | null;
  visibleRecentVideos: TravelVideoLocation[];
  nextDestination: DestinationCandidate | null;
  destinationCandidates: DestinationCandidate[];
  activeVideo: TravelVideoLocation | null;
  showLegend: boolean;
  showOperationsPanel: boolean;
  showActiveVideoCard: boolean;
  windowFilter: FilterWindow;
  searchQuery: string;
  syncState: SyncState;
  syncError: string | null;
  lastSyncSummary: SyncSummary | null;
  copyState: "idle" | "copied" | "error";
  allowRefresh: boolean;
  interactive: boolean;
  mobileMenuOpen: boolean;
  desktopMenuHidden: boolean;
  availablePollOptions: PollOptionInput[];
  videosRailRef: RefObject<HTMLDivElement | null>;
  votesRailRef: RefObject<HTMLDivElement | null>;
  sponsorsRailRef: RefObject<HTMLDivElement | null>;
  setWindowFilter: Dispatch<SetStateAction<FilterWindow>>;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  setMobileMenuOpen: Dispatch<SetStateAction<boolean>>;
  setDesktopMenuHidden: Dispatch<SetStateAction<boolean>>;
  setPollState: Dispatch<SetStateAction<MapPollRecord | null>>;
  locateFirstSearchResult: () => void;
  selectCountry: (countryCode: string | null) => void;
  openVideo: (video: TravelVideoLocation) => void;
  copyShareUrl: () => Promise<void>;
  handleRefresh: () => Promise<void>;
  setMissingVideosOpen: Dispatch<SetStateAction<boolean>>;
  scrollToRail: (ref: RefObject<HTMLDivElement | null>) => void;
};

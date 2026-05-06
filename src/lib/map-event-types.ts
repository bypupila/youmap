export const MAP_EVENT_TYPES = [
  "map_view",
  "country_select",
  "video_panel_open",
  "youtube_external_open",
  "sponsor_impression",
  "sponsor_click",
  "inquiry_submit",
  "poll_vote",
  "share_url_copied",
] as const;

export type MapEventType = (typeof MAP_EVENT_TYPES)[number];

export type MapEventViewerMode = "viewer" | "creator" | "demo";

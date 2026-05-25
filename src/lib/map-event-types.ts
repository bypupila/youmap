export const MAP_EVENT_TYPES = [
  "map_view",
  "country_select",
  "video_panel_open",
  "youtube_external_open",
  "video_saved_added",
  "video_saved_removed",
  "video_favorite_added",
  "video_favorite_removed",
  "video_watch_later_added",
  "video_watch_later_removed",
  "video_watch_time_logged",
  "sponsor_impression",
  "sponsor_click",
  "inquiry_submit",
  "poll_vote",
  "share_url_copied",
] as const;

export type MapEventType = (typeof MAP_EVENT_TYPES)[number];

export type MapEventViewerMode = "viewer" | "creator" | "demo";

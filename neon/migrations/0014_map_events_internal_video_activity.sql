alter table public.map_events
  drop constraint if exists map_events_event_type_check;

alter table public.map_events
  add constraint map_events_event_type_check check (
    event_type in (
      'map_view',
      'country_select',
      'video_panel_open',
      'youtube_external_open',
      'video_saved_added',
      'video_saved_removed',
      'video_favorite_added',
      'video_favorite_removed',
      'video_watch_later_added',
      'video_watch_later_removed',
      'video_watch_time_logged',
      'sponsor_impression',
      'sponsor_click',
      'inquiry_submit',
      'poll_vote',
      'share_url_copied'
    )
  );

create index if not exists map_events_channel_event_created_at_idx
  on public.map_events (channel_id, event_type, created_at desc);

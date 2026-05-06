create table if not exists public.map_events (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  event_type text not null,
  viewer_mode text,
  path text,
  referrer text,
  country_code text,
  youtube_video_id text,
  sponsor_id uuid references public.sponsors(id) on delete set null,
  poll_id uuid references public.map_polls(id) on delete set null,
  ip_hash text,
  user_agent_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint map_events_event_type_check check (
    event_type in (
      'map_view',
      'country_select',
      'video_panel_open',
      'youtube_external_open',
      'sponsor_impression',
      'sponsor_click',
      'inquiry_submit',
      'poll_vote',
      'share_url_copied'
    )
  ),
  constraint map_events_viewer_mode_check check (
    viewer_mode is null or viewer_mode in ('viewer', 'creator', 'demo')
  )
);

create index if not exists map_events_channel_created_at_idx
  on public.map_events (channel_id, created_at desc);

create index if not exists map_events_event_created_at_idx
  on public.map_events (event_type, created_at desc);

create index if not exists map_events_sponsor_event_created_at_idx
  on public.map_events (sponsor_id, event_type, created_at desc)
  where sponsor_id is not null;

create index if not exists map_events_poll_id_idx
  on public.map_events (poll_id)
  where poll_id is not null;

create index if not exists map_events_country_code_idx
  on public.map_events (country_code)
  where country_code is not null;

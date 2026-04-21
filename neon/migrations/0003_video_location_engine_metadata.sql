alter table public.videos
  add column if not exists playlist_signals jsonb not null default '[]'::jsonb,
  add column if not exists geo_hints jsonb not null default '[]'::jsonb,
  add column if not exists location_precision text not null default 'unresolved';

alter table public.video_locations
  add column if not exists location_precision text not null default 'unresolved';

create index if not exists videos_location_precision_idx on public.videos (location_precision);
create index if not exists video_locations_location_precision_idx on public.video_locations (location_precision);

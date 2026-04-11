alter table public.videos
  add column if not exists duration_seconds integer,
  add column if not exists is_short boolean not null default false,
  add column if not exists is_travel boolean not null default true,
  add column if not exists travel_score numeric(4,3),
  add column if not exists travel_signals jsonb not null default '[]'::jsonb,
  add column if not exists inclusion_reason text,
  add column if not exists exclusion_reason text,
  add column if not exists recording_lat numeric,
  add column if not exists recording_lng numeric,
  add column if not exists recording_location_description text;

update public.videos
set
  is_short = coalesce(is_short, false),
  is_travel = coalesce(is_travel, true),
  travel_signals = coalesce(travel_signals, '[]'::jsonb)
where
  is_short is null
  or is_travel is null
  or travel_signals is null;

create index if not exists videos_is_travel_idx on public.videos (is_travel);
create index if not exists videos_is_short_idx on public.videos (is_short);
create index if not exists videos_duration_seconds_idx on public.videos (duration_seconds);

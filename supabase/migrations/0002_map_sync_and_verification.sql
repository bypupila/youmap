alter type public.video_location_status add value if not exists 'verified_auto';
alter type public.video_location_status add value if not exists 'needs_manual';
alter type public.video_location_status add value if not exists 'verified_manual';

alter table public.channels
  add column if not exists last_synced_at timestamptz;

alter table public.videos
  add column if not exists location_score numeric(4,3),
  add column if not exists verification_source text,
  add column if not exists location_evidence jsonb not null default '{}'::jsonb,
  add column if not exists needs_manual_reason text,
  add column if not exists last_location_checked_at timestamptz;

create index if not exists videos_verification_source_idx on public.videos (verification_source);

alter table public.video_locations
  add column if not exists location_score numeric(4,3),
  add column if not exists verification_source text,
  add column if not exists location_evidence jsonb not null default '{}'::jsonb,
  add column if not exists needs_manual_reason text;

create table if not exists public.map_sync_runs (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  status public.job_status not null default 'queued',
  source text not null default 'manual_refresh',
  videos_scanned integer not null default 0,
  videos_extracted integer not null default 0,
  videos_verified_auto integer not null default 0,
  videos_needs_manual integer not null default 0,
  videos_verified_manual integer not null default 0,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists map_sync_runs_channel_id_idx on public.map_sync_runs (channel_id);
create index if not exists map_sync_runs_status_idx on public.map_sync_runs (status);

alter table public.map_sync_runs enable row level security;

create policy map_sync_runs_owner_access on public.map_sync_runs
  for all using (
    exists (
      select 1
      from public.channels c
      where c.id = public.map_sync_runs.channel_id
        and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.channels c
      where c.id = public.map_sync_runs.channel_id
        and c.user_id = auth.uid()
    )
  );

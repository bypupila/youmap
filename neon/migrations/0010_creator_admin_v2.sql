alter table public.videos
  add column if not exists visible_on_map boolean not null default true,
  add column if not exists featured boolean not null default false,
  add column if not exists internal_notes text;

alter table public.video_locations
  add column if not exists internal_notes text;

alter table public.sponsors
  add column if not exists start_date timestamptz,
  add column if not exists end_date timestamptz,
  add column if not exists internal_notes text;

create table if not exists public.sponsor_video_rules (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists sponsor_video_rules_unique_video
  on public.sponsor_video_rules (sponsor_id, video_id);

create index if not exists sponsor_video_rules_sponsor_id_idx
  on public.sponsor_video_rules (sponsor_id);

create index if not exists sponsor_video_rules_video_id_idx
  on public.sponsor_video_rules (video_id);

alter table public.map_polls
  add column if not exists visibility text not null default 'public',
  add column if not exists winner_country_code text,
  add column if not exists winner_city text,
  add column if not exists converted_to_destination boolean not null default false,
  add column if not exists sponsor_id uuid references public.sponsors(id) on delete set null,
  add column if not exists sponsor_url text;

alter table public.map_polls
  drop constraint if exists map_polls_visibility_check;

alter table public.map_polls
  add constraint map_polls_visibility_check
  check (visibility in ('public', 'link_only'));

create table if not exists public.creator_activity_log (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id text,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  severity text not null default 'info',
  created_at timestamptz not null default now(),
  constraint creator_activity_log_severity_check
    check (severity in ('info', 'warning', 'error'))
);

create index if not exists creator_activity_log_channel_created_at_idx
  on public.creator_activity_log (channel_id, created_at desc);

create index if not exists creator_activity_log_entity_idx
  on public.creator_activity_log (entity_type, entity_id);

drop trigger if exists sponsor_video_rules_touch_updated_at on public.sponsor_video_rules;
create trigger sponsor_video_rules_touch_updated_at
  before update on public.sponsor_video_rules
  for each row execute function public.touch_updated_at();

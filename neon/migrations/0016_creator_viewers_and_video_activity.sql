create table if not exists public.creator_viewer_subscriptions (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  creator_user_id uuid not null references public.users(id) on delete cascade,
  viewer_user_id uuid not null references public.users(id) on delete cascade,
  source text not null default 'creator_map',
  registration_utm_source text,
  registration_utm_medium text,
  registration_utm_campaign text,
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_viewer_subscriptions_source_check
    check (source in ('creator_map', 'viewer_register', 'viewer_login', 'manual_import')),
  constraint creator_viewer_subscriptions_not_self_check
    check (creator_user_id <> viewer_user_id)
);

create unique index if not exists creator_viewer_subscriptions_channel_viewer_key
  on public.creator_viewer_subscriptions (channel_id, viewer_user_id);

create index if not exists creator_viewer_subscriptions_creator_active_idx
  on public.creator_viewer_subscriptions (creator_user_id, subscribed_at desc)
  where unsubscribed_at is null;

create index if not exists creator_viewer_subscriptions_viewer_idx
  on public.creator_viewer_subscriptions (viewer_user_id, subscribed_at desc);

drop trigger if exists creator_viewer_subscriptions_touch_updated_at on public.creator_viewer_subscriptions;
create trigger creator_viewer_subscriptions_touch_updated_at
  before update on public.creator_viewer_subscriptions
  for each row execute function public.touch_updated_at();

create table if not exists public.viewer_video_activity (
  user_id uuid not null references public.users(id) on delete cascade,
  channel_id uuid not null references public.channels(id) on delete cascade,
  youtube_video_id text not null,
  saved boolean not null default false,
  favorite boolean not null default false,
  watch_status text not null default 'not_started',
  seen_at timestamptz,
  opened_at timestamptz,
  last_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, channel_id, youtube_video_id),
  constraint viewer_video_activity_watch_status_check
    check (watch_status in ('not_started', 'not_finished', 'watched', 'watch_later'))
);

create index if not exists viewer_video_activity_channel_updated_idx
  on public.viewer_video_activity (channel_id, updated_at desc);

create index if not exists viewer_video_activity_user_updated_idx
  on public.viewer_video_activity (user_id, updated_at desc);

drop trigger if exists viewer_video_activity_touch_updated_at on public.viewer_video_activity;
create trigger viewer_video_activity_touch_updated_at
  before update on public.viewer_video_activity
  for each row execute function public.touch_updated_at();

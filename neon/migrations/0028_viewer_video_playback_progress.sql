alter table public.viewer_video_activity
  add column if not exists last_position_seconds integer not null default 0,
  add column if not exists watched_seconds integer not null default 0,
  add column if not exists duration_seconds integer not null default 0,
  add column if not exists progress_updated_at timestamptz;

alter table public.viewer_video_activity
  drop constraint if exists viewer_video_activity_progress_seconds_check;

alter table public.viewer_video_activity
  add constraint viewer_video_activity_progress_seconds_check
    check (
      last_position_seconds >= 0
      and watched_seconds >= 0
      and duration_seconds >= 0
    );

create index if not exists viewer_video_activity_resume_idx
  on public.viewer_video_activity (user_id, channel_id, updated_at desc)
  where last_position_seconds > 0;

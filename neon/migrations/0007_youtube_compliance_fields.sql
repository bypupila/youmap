alter table public.videos
  add column if not exists made_for_kids boolean,
  add column if not exists youtube_data_refreshed_at timestamptz,
  add column if not exists youtube_data_expires_at timestamptz;

create index if not exists videos_youtube_data_expires_at_idx
  on public.videos (youtube_data_expires_at);

alter table public.onboarding_state
  add column if not exists accepted_terms_at timestamptz;

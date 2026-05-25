create table if not exists public.sponsor_bulk_assign_jobs (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete set null,
  status text not null default 'queued',
  reason text,
  set_primary boolean not null default true,
  requested_video_ids jsonb not null default '[]'::jsonb,
  valid_video_ids jsonb not null default '[]'::jsonb,
  skipped_video_ids jsonb not null default '[]'::jsonb,
  snapshot jsonb not null default '[]'::jsonb,
  requested_count int not null default 0,
  applied_count int not null default 0,
  skipped_count int not null default 0,
  error_message text,
  reversible_until timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  reverted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsor_bulk_assign_jobs_status_check
    check (status in ('queued', 'running', 'completed', 'failed', 'reverted'))
);

create index if not exists sponsor_bulk_assign_jobs_channel_created_idx
  on public.sponsor_bulk_assign_jobs (channel_id, created_at desc);

create index if not exists sponsor_bulk_assign_jobs_status_created_idx
  on public.sponsor_bulk_assign_jobs (status, created_at asc);

create index if not exists sponsor_bulk_assign_jobs_sponsor_created_idx
  on public.sponsor_bulk_assign_jobs (sponsor_id, created_at desc);

drop trigger if exists trg_sponsor_bulk_assign_jobs_updated_at on public.sponsor_bulk_assign_jobs;
create trigger trg_sponsor_bulk_assign_jobs_updated_at
before update on public.sponsor_bulk_assign_jobs
for each row execute function public.touch_updated_at();

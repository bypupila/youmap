create table if not exists public.sponsor_report_links (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  created_by_user_id uuid references public.users(id) on delete set null,
  token_hash text not null unique,
  label text,
  period_days integer not null default 30,
  active boolean not null default true,
  view_count integer not null default 0,
  last_viewed_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsor_report_links_period_days_check check (period_days between 7 and 365)
);

create index if not exists sponsor_report_links_channel_created_idx
  on public.sponsor_report_links (channel_id, created_at desc);

create index if not exists sponsor_report_links_sponsor_active_idx
  on public.sponsor_report_links (sponsor_id, active, created_at desc);

drop trigger if exists trg_sponsor_report_links_updated_at on public.sponsor_report_links;
create trigger trg_sponsor_report_links_updated_at
before update on public.sponsor_report_links
for each row execute function public.touch_updated_at();

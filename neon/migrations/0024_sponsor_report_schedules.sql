create table if not exists public.sponsor_report_schedules (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  created_by_user_id uuid not null references public.users(id) on delete cascade,
  cadence text not null default 'monthly',
  period_days integer not null default 30,
  recipient_email text not null,
  active boolean not null default true,
  next_run_at timestamptz not null,
  last_run_at timestamptz,
  last_report_link_id uuid references public.sponsor_report_links(id) on delete set null,
  last_email_sent_at timestamptz,
  last_error text,
  paused_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsor_report_schedules_cadence_check check (cadence in ('weekly', 'monthly', 'quarterly')),
  constraint sponsor_report_schedules_period_days_check check (period_days between 7 and 365),
  constraint sponsor_report_schedules_email_check check (position('@' in recipient_email) > 1)
);

create index if not exists sponsor_report_schedules_channel_created_idx
  on public.sponsor_report_schedules (channel_id, created_at desc);

create index if not exists sponsor_report_schedules_due_idx
  on public.sponsor_report_schedules (active, next_run_at)
  where active = true;

create index if not exists sponsor_report_schedules_sponsor_active_idx
  on public.sponsor_report_schedules (sponsor_id, active, created_at desc);

drop trigger if exists trg_sponsor_report_schedules_updated_at on public.sponsor_report_schedules;
create trigger trg_sponsor_report_schedules_updated_at
before update on public.sponsor_report_schedules
for each row execute function public.touch_updated_at();

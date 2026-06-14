create table if not exists public.sponsor_campaigns (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  creator_user_id uuid not null references public.users(id) on delete cascade,
  sponsor_id uuid references public.sponsors(id) on delete set null,
  inquiry_id uuid references public.sponsor_inquiries(id) on delete set null,
  title text not null,
  brand_name text not null,
  status text not null default 'proposal',
  budget_usd integer,
  start_date date,
  end_date date,
  objective text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsor_campaigns_status_check check (status in ('lead', 'proposal', 'negotiation', 'active', 'delivered', 'paid', 'lost')),
  constraint sponsor_campaigns_budget_check check (budget_usd is null or budget_usd > 0)
);

create index if not exists sponsor_campaigns_channel_created_idx
  on public.sponsor_campaigns (channel_id, created_at desc);

create index if not exists sponsor_campaigns_status_idx
  on public.sponsor_campaigns (status);

create index if not exists sponsor_campaigns_inquiry_idx
  on public.sponsor_campaigns (inquiry_id)
  where inquiry_id is not null;

create table if not exists public.sponsor_campaign_deliverables (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.sponsor_campaigns(id) on delete cascade,
  title text not null,
  deliverable_type text not null default 'video',
  due_date date,
  status text not null default 'todo',
  public_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsor_campaign_deliverables_status_check check (status in ('todo', 'in_progress', 'submitted', 'approved', 'published')),
  constraint sponsor_campaign_deliverables_type_check check (deliverable_type in ('video', 'short', 'story', 'post', 'map_placement', 'report', 'other'))
);

create index if not exists sponsor_campaign_deliverables_campaign_idx
  on public.sponsor_campaign_deliverables (campaign_id, created_at asc);

create table if not exists public.sponsor_campaign_payments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.sponsor_campaigns(id) on delete cascade,
  label text not null default 'Pago',
  amount_usd integer not null,
  due_date date,
  status text not null default 'pending',
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsor_campaign_payments_amount_check check (amount_usd > 0),
  constraint sponsor_campaign_payments_status_check check (status in ('pending', 'invoiced', 'paid', 'overdue'))
);

create index if not exists sponsor_campaign_payments_campaign_idx
  on public.sponsor_campaign_payments (campaign_id, created_at asc);

drop trigger if exists trg_sponsor_campaigns_updated_at on public.sponsor_campaigns;
create trigger trg_sponsor_campaigns_updated_at
before update on public.sponsor_campaigns
for each row execute function public.touch_updated_at();

drop trigger if exists trg_sponsor_campaign_deliverables_updated_at on public.sponsor_campaign_deliverables;
create trigger trg_sponsor_campaign_deliverables_updated_at
before update on public.sponsor_campaign_deliverables
for each row execute function public.touch_updated_at();

drop trigger if exists trg_sponsor_campaign_payments_updated_at on public.sponsor_campaign_payments;
create trigger trg_sponsor_campaign_payments_updated_at
before update on public.sponsor_campaign_payments
for each row execute function public.touch_updated_at();

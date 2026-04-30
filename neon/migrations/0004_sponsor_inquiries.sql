create table if not exists public.sponsor_inquiries (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  creator_user_id uuid not null references public.users(id) on delete cascade,
  brand_name text not null,
  contact_name text not null,
  contact_email text not null,
  website_url text,
  whatsapp text,
  proposed_budget_usd integer,
  brief text not null,
  status text not null default 'new',
  source text not null default 'map_viewer_cta',
  map_url text,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsor_inquiries_budget_check check (proposed_budget_usd is null or proposed_budget_usd > 0)
);

create index if not exists sponsor_inquiries_channel_id_idx on public.sponsor_inquiries (channel_id);
create index if not exists sponsor_inquiries_creator_user_id_idx on public.sponsor_inquiries (creator_user_id);
create index if not exists sponsor_inquiries_status_idx on public.sponsor_inquiries (status);
create index if not exists sponsor_inquiries_created_at_idx on public.sponsor_inquiries (created_at desc);

drop trigger if exists sponsor_inquiries_touch_updated_at on public.sponsor_inquiries;
create trigger sponsor_inquiries_touch_updated_at before update on public.sponsor_inquiries for each row execute function public.touch_updated_at();

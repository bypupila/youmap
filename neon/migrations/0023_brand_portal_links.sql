create table if not exists public.brand_portal_links (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  campaign_id uuid not null references public.sponsor_campaigns(id) on delete cascade,
  created_by_user_id uuid references public.users(id) on delete set null,
  token_hash text not null unique,
  active boolean not null default true,
  view_count integer not null default 0,
  last_viewed_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists brand_portal_links_channel_created_idx
  on public.brand_portal_links (channel_id, created_at desc);

create index if not exists brand_portal_links_campaign_active_idx
  on public.brand_portal_links (campaign_id, active, created_at desc);

drop trigger if exists trg_brand_portal_links_updated_at on public.brand_portal_links;
create trigger trg_brand_portal_links_updated_at
before update on public.brand_portal_links
for each row execute function public.touch_updated_at();

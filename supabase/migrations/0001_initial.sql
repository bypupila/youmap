create extension if not exists pgcrypto;

create type public.video_location_status as enum ('pending', 'processing', 'mapped', 'no_location', 'failed');
create type public.import_run_status as enum ('queued', 'running', 'completed', 'failed', 'canceled');
create type public.job_status as enum ('queued', 'running', 'completed', 'failed', 'canceled');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'paused');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key,
  username text not null unique,
  email text not null unique,
  display_name text not null,
  avatar_url text,
  google_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  youtube_channel_id text unique,
  channel_name text not null,
  channel_handle text,
  thumbnail_url text,
  subscriber_count bigint,
  description text,
  is_public boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists channels_user_id_key on public.channels (user_id);

create table if not exists public.channel_import_runs (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  status public.import_run_status not null default 'queued',
  source text not null default 'youtube',
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  youtube_video_id text not null,
  title text not null,
  description text,
  thumbnail_url text,
  published_at timestamptz,
  view_count bigint not null default 0,
  like_count bigint,
  comment_count bigint,
  travel_type text,
  location_status public.video_location_status not null default 'pending',
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists videos_channel_youtube_key on public.videos (channel_id, youtube_video_id);
create index if not exists videos_channel_id_idx on public.videos (channel_id);
create index if not exists videos_location_status_idx on public.videos (location_status);

create table if not exists public.video_locations (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  is_primary boolean not null default false,
  country_code text not null,
  country_name text,
  location_label text,
  city text,
  region text,
  lat numeric not null,
  lng numeric not null,
  confidence_score numeric(4,3),
  travel_type text,
  source text not null default 'gemini',
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists video_locations_channel_id_idx on public.video_locations (channel_id);
create index if not exists video_locations_video_id_idx on public.video_locations (video_id);
create index if not exists video_locations_country_code_idx on public.video_locations (country_code);
create index if not exists video_locations_primary_idx on public.video_locations (channel_id, is_primary);

create table if not exists public.location_extraction_runs (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  status public.job_status not null default 'queued',
  prompt_version text not null default 'v1',
  model text,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error_message text,
  attempts integer not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists location_extraction_runs_video_id_key on public.location_extraction_runs (video_id);

create table if not exists public.onboarding_state (
  user_id uuid primary key references public.users(id) on delete cascade,
  current_step text not null default 'welcome',
  completed_steps text[] not null default '{}'::text[],
  demo_mode boolean not null default false,
  selected_plan text,
  youtube_channel_id text,
  channel_id uuid references public.channels(id) on delete set null,
  is_complete boolean not null default false,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  price_usd numeric(10,2) not null default 0,
  polar_product_id text unique,
  polar_price_id text unique,
  max_videos integer,
  max_sponsors integer,
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  polar_subscription_id text not null unique,
  polar_customer_id text not null,
  status public.subscription_status not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  brand_name text not null,
  logo_url text,
  website_url text,
  affiliate_url text,
  discount_code text,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sponsors_user_id_idx on public.sponsors (user_id);
create index if not exists sponsors_active_idx on public.sponsors (active);

create table if not exists public.sponsor_geo_rules (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  country_code text,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists sponsor_geo_rules_unique_country on public.sponsor_geo_rules (sponsor_id, country_code);
create index if not exists sponsor_geo_rules_sponsor_id_idx on public.sponsor_geo_rules (sponsor_id);
create index if not exists sponsor_geo_rules_country_code_idx on public.sponsor_geo_rules (country_code);

create table if not exists public.sponsor_clicks (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references public.sponsors(id) on delete cascade,
  channel_id uuid references public.channels(id) on delete set null,
  country_code text,
  ip_hash text,
  clicked_at timestamptz not null default now()
);

create index if not exists sponsor_clicks_sponsor_id_idx on public.sponsor_clicks (sponsor_id);
create index if not exists sponsor_clicks_channel_id_idx on public.sponsor_clicks (channel_id);
create index if not exists sponsor_clicks_clicked_at_idx on public.sponsor_clicks (clicked_at);

create table if not exists public.channel_monthly_metrics (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  metric_month date not null,
  total_countries integer not null default 0,
  total_mapped_videos integer not null default 0,
  total_views bigint not null default 0,
  monthly_visitors bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists channel_monthly_metrics_unique_month on public.channel_monthly_metrics (channel_id, metric_month);
create index if not exists channel_monthly_metrics_channel_id_idx on public.channel_monthly_metrics (channel_id);

alter table public.users enable row level security;
alter table public.channels enable row level security;
alter table public.channel_import_runs enable row level security;
alter table public.videos enable row level security;
alter table public.video_locations enable row level security;
alter table public.location_extraction_runs enable row level security;
alter table public.onboarding_state enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.sponsors enable row level security;
alter table public.sponsor_geo_rules enable row level security;
alter table public.sponsor_clicks enable row level security;
alter table public.channel_monthly_metrics enable row level security;

create policy users_select_own on public.users
  for select using (auth.uid() = id);

create policy users_insert_own on public.users
  for insert with check (auth.uid() = id);

create policy users_update_own on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy channels_owner_access on public.channels
  for all using (
    exists (
      select 1 from public.users u where u.id = public.channels.user_id and u.id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.users u where u.id = public.channels.user_id and u.id = auth.uid()
    )
  );

create policy channel_import_runs_owner_access on public.channel_import_runs
  for all using (
    exists (
      select 1
      from public.channels c
      where c.id = public.channel_import_runs.channel_id
        and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.channels c
      where c.id = public.channel_import_runs.channel_id
        and c.user_id = auth.uid()
    )
  );

create policy videos_owner_access on public.videos
  for all using (
    exists (
      select 1
      from public.channels c
      where c.id = public.videos.channel_id
        and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.channels c
      where c.id = public.videos.channel_id
        and c.user_id = auth.uid()
    )
  );

create policy video_locations_owner_access on public.video_locations
  for all using (
    exists (
      select 1
      from public.channels c
      where c.id = public.video_locations.channel_id
        and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.channels c
      where c.id = public.video_locations.channel_id
        and c.user_id = auth.uid()
    )
  );

create policy location_extraction_runs_owner_access on public.location_extraction_runs
  for all using (
    exists (
      select 1
      from public.channels c
      where c.id = public.location_extraction_runs.channel_id
        and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.channels c
      where c.id = public.location_extraction_runs.channel_id
        and c.user_id = auth.uid()
    )
  );

create policy onboarding_state_owner_access on public.onboarding_state
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy subscriptions_owner_access on public.subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy sponsors_owner_access on public.sponsors
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy sponsor_geo_rules_owner_access on public.sponsor_geo_rules
  for all using (
    exists (
      select 1
      from public.sponsors s
      where s.id = public.sponsor_geo_rules.sponsor_id
        and s.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.sponsors s
      where s.id = public.sponsor_geo_rules.sponsor_id
        and s.user_id = auth.uid()
    )
  );

create policy sponsor_clicks_owner_read on public.sponsor_clicks
  for select using (
    exists (
      select 1
      from public.sponsors s
      where s.id = public.sponsor_clicks.sponsor_id
        and s.user_id = auth.uid()
    )
  );

create policy channel_monthly_metrics_owner_access on public.channel_monthly_metrics
  for all using (
    exists (
      select 1
      from public.channels c
      where c.id = public.channel_monthly_metrics.channel_id
        and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.channels c
      where c.id = public.channel_monthly_metrics.channel_id
        and c.user_id = auth.uid()
    )
  );

create or replace function public.get_top_countries_for_channel(p_channel_id uuid)
returns table(country_name text, video_count bigint)
language sql
stable
as $$
  select
    coalesce(vl.country_name, vl.country_code) as country_name,
    count(*)::bigint as video_count
  from public.video_locations vl
  where vl.channel_id = p_channel_id
    and vl.is_primary = true
  group by 1
  order by video_count desc, country_name asc;
$$;

create or replace function public.get_videos_by_month(p_channel_id uuid)
returns table(month text, count bigint)
language sql
stable
as $$
  select
    to_char(date_trunc('month', v.published_at), 'YYYY-MM') as month,
    count(*)::bigint as count
  from public.videos v
  where v.channel_id = p_channel_id
    and v.published_at is not null
  group by 1
  order by 1 asc;
$$;

create or replace function public.get_channel_stats(p_channel_id uuid)
returns table(
  total_countries integer,
  total_mapped integer,
  total_views bigint,
  monthly_visitors bigint
)
language sql
stable
as $$
  with latest_metrics as (
    select m.*
    from public.channel_monthly_metrics m
    where m.channel_id = p_channel_id
    order by m.metric_month desc
    limit 1
  ),
  fallback as (
    select
      count(distinct vl.country_code)::integer as total_countries,
      count(*) filter (where v.location_status = 'mapped')::integer as total_mapped,
      coalesce(sum(v.view_count), 0)::bigint as total_views
    from public.videos v
    left join public.video_locations vl
      on vl.video_id = v.id
     and vl.is_primary = true
    where v.channel_id = p_channel_id
  )
  select
    coalesce(lm.total_countries, fb.total_countries) as total_countries,
    coalesce(lm.total_mapped_videos, fb.total_mapped) as total_mapped,
    coalesce(lm.total_views, fb.total_views) as total_views,
    coalesce(lm.monthly_visitors, 0) as monthly_visitors
  from fallback fb
  left join latest_metrics lm on true;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_touch_updated_at before update on public.users
for each row execute function public.touch_updated_at();

create trigger channels_touch_updated_at before update on public.channels
for each row execute function public.touch_updated_at();

create trigger channel_import_runs_touch_updated_at before update on public.channel_import_runs
for each row execute function public.touch_updated_at();

create trigger videos_touch_updated_at before update on public.videos
for each row execute function public.touch_updated_at();

create trigger video_locations_touch_updated_at before update on public.video_locations
for each row execute function public.touch_updated_at();

create trigger location_extraction_runs_touch_updated_at before update on public.location_extraction_runs
for each row execute function public.touch_updated_at();

create trigger onboarding_state_touch_updated_at before update on public.onboarding_state
for each row execute function public.touch_updated_at();

create trigger subscription_plans_touch_updated_at before update on public.subscription_plans
for each row execute function public.touch_updated_at();

create trigger subscriptions_touch_updated_at before update on public.subscriptions
for each row execute function public.touch_updated_at();

create trigger sponsors_touch_updated_at before update on public.sponsors
for each row execute function public.touch_updated_at();

create trigger sponsor_geo_rules_touch_updated_at before update on public.sponsor_geo_rules
for each row execute function public.touch_updated_at();

create trigger channel_monthly_metrics_touch_updated_at before update on public.channel_monthly_metrics
for each row execute function public.touch_updated_at();

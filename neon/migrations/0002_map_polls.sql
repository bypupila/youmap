do $$
begin
  if not exists (select 1 from pg_type where typname = 'map_poll_status') then
    create type public.map_poll_status as enum ('draft', 'live', 'closed');
  end if;
end $$;

create table if not exists public.map_polls (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  title text not null,
  prompt text not null,
  status public.map_poll_status not null default 'draft',
  show_popup boolean not null default false,
  published_at timestamptz,
  closes_at timestamptz,
  created_by_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists map_polls_channel_id_idx on public.map_polls (channel_id);
create index if not exists map_polls_status_idx on public.map_polls (status);
create unique index if not exists map_polls_live_channel_idx on public.map_polls (channel_id) where status = 'live';

create table if not exists public.map_poll_country_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.map_polls(id) on delete cascade,
  country_code text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists map_poll_country_options_unique on public.map_poll_country_options (poll_id, country_code);
create index if not exists map_poll_country_options_poll_id_idx on public.map_poll_country_options (poll_id);

create table if not exists public.map_poll_city_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.map_polls(id) on delete cascade,
  country_code text not null,
  city text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists map_poll_city_options_unique on public.map_poll_city_options (poll_id, country_code, city);
create index if not exists map_poll_city_options_poll_id_idx on public.map_poll_city_options (poll_id);
create index if not exists map_poll_city_options_country_code_idx on public.map_poll_city_options (country_code);

create table if not exists public.map_poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.map_polls(id) on delete cascade,
  country_code text not null,
  city text not null,
  voter_fingerprint text not null,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now()
);

create unique index if not exists map_poll_votes_unique_voter on public.map_poll_votes (poll_id, voter_fingerprint);
create index if not exists map_poll_votes_poll_id_idx on public.map_poll_votes (poll_id);
create index if not exists map_poll_votes_country_code_idx on public.map_poll_votes (country_code);

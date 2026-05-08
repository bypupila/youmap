create table if not exists public.map_fan_votes (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  country_code text not null,
  city text,
  voter_identity text not null,
  voter_fingerprint text not null,
  voter_user_id uuid references public.users(id) on delete set null,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now(),
  constraint map_fan_votes_country_code_check check (country_code ~ '^[A-Z]{2}$')
);

create index if not exists map_fan_votes_channel_created_at_idx
  on public.map_fan_votes (channel_id, created_at desc);

create index if not exists map_fan_votes_channel_country_idx
  on public.map_fan_votes (channel_id, country_code);

create index if not exists map_fan_votes_channel_country_city_idx
  on public.map_fan_votes (channel_id, country_code, city)
  where city is not null;

create index if not exists map_fan_votes_channel_identity_created_at_idx
  on public.map_fan_votes (channel_id, voter_identity, created_at desc);

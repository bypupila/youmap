do $$
begin
  if not exists (select 1 from pg_type where typname = 'sponsor_detection_status') then
    create type public.sponsor_detection_status as enum (
      'confirmado',
      'detectado_automaticamente',
      'pendiente_revision',
      'no_disponible'
    );
  end if;
end $$;

alter table public.videos
  add column if not exists sponsor_detection_status public.sponsor_detection_status not null default 'no_disponible',
  add column if not exists sponsor_detectado_texto text,
  add column if not exists sponsor_detectado_confianza numeric(4,3),
  add column if not exists sponsor_detectado_fuente text;

create index if not exists videos_sponsor_detection_status_idx
  on public.videos (sponsor_detection_status);

alter table public.sponsor_video_rules
  add column if not exists is_primary boolean not null default false;

create unique index if not exists sponsor_video_rules_primary_unique_video
  on public.sponsor_video_rules (video_id)
  where is_primary = true;

alter table public.users
  alter column role set default 'viewer';

create table if not exists public.viewer_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  country_code text not null,
  city text not null,
  has_youtube_travel_channel boolean not null default false,
  youtube_channel_url text,
  registration_source text not null default 'platform',
  registration_channel_id uuid references public.channels(id) on delete set null,
  registration_utm_source text,
  registration_utm_medium text,
  registration_utm_campaign text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists viewer_profiles_country_code_idx on public.viewer_profiles (country_code);
create index if not exists viewer_profiles_registration_channel_id_idx on public.viewer_profiles (registration_channel_id);

create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  consent_type text not null,
  accepted boolean not null,
  consent_version text not null,
  accepted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_consents_user_id_idx on public.user_consents (user_id);
create index if not exists user_consents_type_idx on public.user_consents (consent_type);

drop trigger if exists viewer_profiles_touch_updated_at on public.viewer_profiles;
create trigger viewer_profiles_touch_updated_at
  before update on public.viewer_profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists user_consents_touch_updated_at on public.user_consents;
create trigger user_consents_touch_updated_at
  before update on public.user_consents
  for each row execute function public.touch_updated_at();

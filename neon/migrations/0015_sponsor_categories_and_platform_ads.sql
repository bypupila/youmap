create table if not exists public.sponsor_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists sponsor_categories_user_slug_key
  on public.sponsor_categories (user_id, slug);

create index if not exists sponsor_categories_user_id_idx
  on public.sponsor_categories (user_id);

alter table public.sponsors
  add column if not exists category_id uuid references public.sponsor_categories(id) on delete set null,
  add column if not exists action_type text not null default 'link',
  add column if not exists action_value text,
  add column if not exists cta_label text,
  add column if not exists display_order integer not null default 100;

alter table public.sponsors
  drop constraint if exists sponsors_action_type_check;

alter table public.sponsors
  add constraint sponsors_action_type_check
  check (action_type in ('link', 'coupon'));

create index if not exists sponsors_display_order_idx
  on public.sponsors (user_id, display_order asc, created_at desc);

create table if not exists public.platform_ads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cta_label text not null default 'Ver oferta',
  href text,
  placement text not null default 'video_footer',
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_ads
  drop constraint if exists platform_ads_placement_check;

alter table public.platform_ads
  add constraint platform_ads_placement_check
  check (placement in ('video_footer'));

create index if not exists platform_ads_active_window_idx
  on public.platform_ads (placement, active, starts_at, ends_at, created_at desc);

drop trigger if exists sponsor_categories_touch_updated_at on public.sponsor_categories;
create trigger sponsor_categories_touch_updated_at
  before update on public.sponsor_categories
  for each row execute function public.touch_updated_at();

drop trigger if exists platform_ads_touch_updated_at on public.platform_ads;
create trigger platform_ads_touch_updated_at
  before update on public.platform_ads
  for each row execute function public.touch_updated_at();

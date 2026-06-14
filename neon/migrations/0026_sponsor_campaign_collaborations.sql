alter table public.sponsor_campaigns
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists currency_code text not null default 'USD',
  add column if not exists agreement_type text,
  add column if not exists agreement_type_other text,
  add column if not exists includes_payment boolean not null default false,
  add column if not exists includes_barter boolean not null default false,
  add column if not exists includes_affiliate boolean not null default false,
  add column if not exists includes_discount_code boolean not null default false,
  add column if not exists includes_map_presence boolean not null default false,
  add column if not exists includes_brand_report boolean not null default false,
  add column if not exists requires_exclusivity boolean not null default false,
  add column if not exists requires_preapproval boolean not null default false,
  add column if not exists requires_travel boolean not null default false,
  add column if not exists evaluation_result text not null default 'not_evaluated',
  add column if not exists minimum_amount integer,
  add column if not exists accepts_barter boolean,
  add column if not exists minimum_requires_payment boolean not null default false,
  add column if not exists minimum_requires_accommodation boolean not null default false,
  add column if not exists minimum_requires_transport boolean not null default false,
  add column if not exists minimum_requires_creative_freedom boolean not null default false,
  add column if not exists minimum_requires_no_preapproval boolean not null default false,
  add column if not exists minimum_requires_clear_dates boolean not null default false,
  add column if not exists minimum_requires_link_or_coupon boolean not null default false,
  add column if not exists minimum_conditions_notes text,
  add column if not exists minimum_fit text not null default 'unknown',
  add column if not exists acceptance_override_note text,
  add column if not exists country_code text,
  add column if not exists destination_label text,
  add column if not exists final_learning_note text,
  add column if not exists would_collaborate_again text;

alter table public.sponsor_campaigns
  drop constraint if exists sponsor_campaigns_currency_code_check,
  drop constraint if exists sponsor_campaigns_agreement_type_check,
  drop constraint if exists sponsor_campaigns_evaluation_result_check,
  drop constraint if exists sponsor_campaigns_minimum_fit_check,
  drop constraint if exists sponsor_campaigns_would_collaborate_again_check,
  drop constraint if exists sponsor_campaigns_minimum_amount_check;

alter table public.sponsor_campaigns
  add constraint sponsor_campaigns_currency_code_check
    check (currency_code in ('USD', 'EUR', 'MXN', 'ARS', 'COP', 'CLP', 'PEN')),
  add constraint sponsor_campaigns_agreement_type_check
    check (agreement_type is null or agreement_type in ('paid_sponsor', 'barter', 'hotel_stay', 'experience', 'product', 'affiliate', 'other')),
  add constraint sponsor_campaigns_evaluation_result_check
    check (evaluation_result in ('good_fit', 'review', 'poor_fit', 'not_evaluated')),
  add constraint sponsor_campaigns_minimum_fit_check
    check (minimum_fit in ('meets', 'partial', 'does_not_meet', 'unknown')),
  add constraint sponsor_campaigns_would_collaborate_again_check
    check (would_collaborate_again is null or would_collaborate_again in ('yes', 'maybe', 'no')),
  add constraint sponsor_campaigns_minimum_amount_check
    check (minimum_amount is null or minimum_amount >= 0);

create index if not exists sponsor_campaigns_agreement_type_idx
  on public.sponsor_campaigns (channel_id, agreement_type, status, updated_at desc)
  where agreement_type is not null;

create index if not exists sponsor_campaigns_currency_status_idx
  on public.sponsor_campaigns (channel_id, currency_code, status);

create table if not exists public.sponsor_campaign_balance_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.sponsor_campaigns(id) on delete cascade,
  kind text not null,
  item_type text not null,
  label text not null,
  enabled boolean not null default true,
  estimated_amount integer,
  actual_amount integer,
  status text not null default 'estimated',
  expected_date date,
  track_in_agenda boolean not null default false,
  notes text,
  sort_order integer not null default 100,
  effort_mode text,
  estimated_hours numeric(8,2),
  actual_hours numeric(8,2),
  hourly_rate integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsor_campaign_balance_items_kind_check
    check (kind in ('in_kind_value', 'cost', 'effort')),
  constraint sponsor_campaign_balance_items_status_check
    check (status in ('estimated', 'promised', 'confirmed', 'received', 'partial', 'not_received', 'paid', 'not_applicable')),
  constraint sponsor_campaign_balance_items_effort_mode_check
    check (effort_mode is null or effort_mode in ('hourly', 'project')),
  constraint sponsor_campaign_balance_items_amount_check
    check (
      (estimated_amount is null or estimated_amount >= 0) and
      (actual_amount is null or actual_amount >= 0) and
      (hourly_rate is null or hourly_rate >= 0) and
      (estimated_hours is null or estimated_hours >= 0) and
      (actual_hours is null or actual_hours >= 0)
    ),
  constraint sponsor_campaign_balance_items_effort_fields_check
    check (
      kind = 'effort' or (
        effort_mode is null and
        estimated_hours is null and
        actual_hours is null and
        hourly_rate is null
      )
    )
);

create index if not exists sponsor_campaign_balance_items_campaign_idx
  on public.sponsor_campaign_balance_items (campaign_id, sort_order asc, created_at asc);

create index if not exists sponsor_campaign_balance_items_agenda_idx
  on public.sponsor_campaign_balance_items (track_in_agenda, expected_date, status)
  where track_in_agenda = true and enabled = true;

drop trigger if exists trg_sponsor_campaign_balance_items_updated_at on public.sponsor_campaign_balance_items;
create trigger trg_sponsor_campaign_balance_items_updated_at
before update on public.sponsor_campaign_balance_items
for each row execute function public.touch_updated_at();

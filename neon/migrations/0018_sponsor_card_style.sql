alter table public.sponsors
  add column if not exists sponsor_card_style text;

alter table public.sponsors
  drop constraint if exists sponsors_sponsor_card_style_check;

alter table public.sponsors
  add constraint sponsors_sponsor_card_style_check
  check (sponsor_card_style in ('cta_red', 'coupon_yellow', 'premium_strip'));

comment on column public.sponsors.sponsor_card_style is 'Optional sponsor preview style used by creator panels and visual sponsor previews.';

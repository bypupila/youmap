alter table public.sponsors
  add column if not exists sponsor_banner_background_color text,
  add column if not exists sponsor_banner_text_color text;

alter table public.sponsors
  drop constraint if exists sponsors_sponsor_banner_background_color_check;

alter table public.sponsors
  add constraint sponsors_sponsor_banner_background_color_check
  check (sponsor_banner_background_color is null or sponsor_banner_background_color ~ '^#[0-9a-fA-F]{6}$');

alter table public.sponsors
  drop constraint if exists sponsors_sponsor_banner_text_color_check;

alter table public.sponsors
  add constraint sponsors_sponsor_banner_text_color_check
  check (sponsor_banner_text_color is null or sponsor_banner_text_color ~ '^#[0-9a-fA-F]{6}$');

comment on column public.sponsors.sponsor_banner_background_color is 'Optional brand background color for the sponsor banner inside sponsor cards.';
comment on column public.sponsors.sponsor_banner_text_color is 'Optional brand text color for the sponsor banner inside sponsor cards.';

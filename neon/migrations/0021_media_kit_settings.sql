create table if not exists public.media_kit_settings (
  channel_id uuid primary key references public.channels(id) on delete cascade,
  public_enabled boolean not null default true,
  headline text,
  bio text,
  audience_note text,
  partnership_email text,
  rate_card_url text,
  preferred_cta_label text,
  featured_country_codes text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_kit_settings_headline_length check (headline is null or char_length(headline) <= 140),
  constraint media_kit_settings_bio_length check (bio is null or char_length(bio) <= 900),
  constraint media_kit_settings_audience_note_length check (audience_note is null or char_length(audience_note) <= 500),
  constraint media_kit_settings_cta_length check (preferred_cta_label is null or char_length(preferred_cta_label) <= 80)
);

drop trigger if exists trg_media_kit_settings_updated_at on public.media_kit_settings;
create trigger trg_media_kit_settings_updated_at
before update on public.media_kit_settings
for each row execute function public.touch_updated_at();

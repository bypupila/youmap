alter table public.videos
  add column if not exists sponsor_card_style text;

comment on column public.videos.sponsor_card_style is 'Video-level sponsor card layout used by public map rails and admin previews.';

-- Demo acquisition channel used by demo map CTAs and viewer registration.
insert into public.users (id, email, username, display_name, role, updated_at)
values (
  '00000000-0000-4000-8000-000000000001',
  'demo@travelyourmap.local',
  'demo',
  'Pupila Nomad',
  'creator',
  now()
)
on conflict (id) do update set
  email = excluded.email,
  username = excluded.username,
  display_name = excluded.display_name,
  role = excluded.role,
  updated_at = excluded.updated_at;

insert into public.channels (
  id,
  user_id,
  channel_name,
  channel_handle,
  thumbnail_url,
  subscriber_count,
  youtube_channel_id,
  is_public,
  published_at,
  last_synced_at,
  updated_at
)
values (
  '11111111-1111-4111-8111-111111111111',
  '00000000-0000-4000-8000-000000000001',
  'Pupila Nomad',
  '@pupila.nomad',
  null,
  128400,
  null,
  true,
  now(),
  now(),
  now()
)
on conflict (id) do update set
  user_id = excluded.user_id,
  channel_name = excluded.channel_name,
  channel_handle = excluded.channel_handle,
  thumbnail_url = excluded.thumbnail_url,
  subscriber_count = excluded.subscriber_count,
  youtube_channel_id = excluded.youtube_channel_id,
  is_public = excluded.is_public,
  published_at = excluded.published_at,
  last_synced_at = excluded.last_synced_at,
  updated_at = excluded.updated_at;

-- Polar launch catalog snapshot: output/polar-travel-bootstrap-2026-04-19.json
-- Keep these IDs in sync with the canonical Polar products used for checkout.
insert into public.subscription_plans (slug, name, price_usd, polar_product_id, polar_price_id, max_videos, max_sponsors, features, is_active)
values
  ('free', 'Free', 0, null, null, 50, 0, '["1 canal","Hasta 50 videos","Mapa publico","Importacion basica"]'::jsonb, true),
  ('creator', 'Creator', 29, null, null, null, 1, '["Videos ilimitados","1 sponsor","Analytics basicos"]'::jsonb, true),
  ('creator_pro', 'Creator Pro', 79, null, null, null, 3, '["Multi-canal","Sponsor hub","Sync prioritaria"]'::jsonb, true),
  ('agency', 'Agency', 199, null, null, null, null, '["Portafolio de canales","API","Soporte dedicado"]'::jsonb, true),
  ('starter', 'Starter', 29, '4dfa4344-c9f3-4a26-bf65-7046aad8d99e', 'a6fc2939-aead-42f1-a28e-dc4f60854091', 100, 1, '["Hasta 100 videos","1 sponsor","Analytics basico"]'::jsonb, true),
  ('pro', 'Pro', 79, '3a0d3c6b-a853-4bc8-b472-1a919ee2606e', '6323cdc5-2b7e-44ef-adbf-c7b5596100b4', null, 3, '["Videos ilimitados","3 sponsors","Analytics avanzado"]'::jsonb, true),
  ('creator_plus', 'Creator+', 199, 'd92c7238-77c5-4bf5-a4f7-0d1109a7a429', 'c8906072-ad98-4f20-9f96-8fe131863ea4', null, null, '["Todo Pro","Sponsors ilimitados","White label"]'::jsonb, true)
on conflict (slug) do update set
  name = excluded.name,
  price_usd = excluded.price_usd,
  polar_product_id = excluded.polar_product_id,
  polar_price_id = excluded.polar_price_id,
  max_videos = excluded.max_videos,
  max_sponsors = excluded.max_sponsors,
  features = excluded.features,
  is_active = excluded.is_active,
  updated_at = now();

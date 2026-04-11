insert into public.users (id, username, email, display_name, avatar_url, google_id)
values (
  '00000000-0000-4000-8000-000000000001',
  'demo',
  'demo@travelmap.local',
  'Pupila Nomad',
  null,
  'google-demo-001'
)
on conflict (id) do update set
  username = excluded.username,
  email = excluded.email,
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url,
  google_id = excluded.google_id;

insert into public.channels (id, user_id, youtube_channel_id, channel_name, channel_handle, thumbnail_url, subscriber_count, description, is_public, published_at)
values (
  '11111111-1111-4111-8111-111111111111',
  '00000000-0000-4000-8000-000000000001',
  'UCDEMO001',
  'Pupila Nomad',
  '@pupila.nomad',
  null,
  128400,
  'Canal demo de viajes con rutas, food tours y road trips.',
  true,
  now()
)
on conflict (id) do update set
  user_id = excluded.user_id,
  youtube_channel_id = excluded.youtube_channel_id,
  channel_name = excluded.channel_name,
  channel_handle = excluded.channel_handle,
  thumbnail_url = excluded.thumbnail_url,
  subscriber_count = excluded.subscriber_count,
  description = excluded.description,
  is_public = excluded.is_public,
  published_at = excluded.published_at;

insert into public.subscription_plans (slug, name, price_usd, polar_product_id, polar_price_id, max_videos, max_sponsors, features, is_active)
values
  ('starter', 'Starter', 29.00, null, null, 100, 1, '["Hasta 100 videos","1 sponsor","Analytics basico","Branding TravelMap"]'::jsonb, true),
  ('pro', 'Pro', 79.00, null, null, null, 3, '["Videos ilimitados","3 sponsors","Analytics avanzado","Dominio custom"]'::jsonb, true),
  ('creator_plus', 'Creator+', 199.00, null, null, null, null, '["Todo Pro","Sponsors ilimitados","White label","API + widget embeddable"]'::jsonb, true)
on conflict (slug) do update set
  name = excluded.name,
  price_usd = excluded.price_usd,
  max_videos = excluded.max_videos,
  max_sponsors = excluded.max_sponsors,
  features = excluded.features,
  is_active = excluded.is_active;

insert into public.subscriptions (user_id, plan_id, polar_subscription_id, polar_customer_id, status, current_period_start, current_period_end, cancel_at_period_end)
select
  '00000000-0000-4000-8000-000000000001',
  sp.id,
  'sub_demo_001',
  'cus_demo_001',
  'trialing',
  now() - interval '1 day',
  now() + interval '13 days',
  false
from public.subscription_plans sp
where sp.slug = 'pro'
on conflict (polar_subscription_id) do update set
  plan_id = excluded.plan_id,
  polar_customer_id = excluded.polar_customer_id,
  status = excluded.status,
  current_period_start = excluded.current_period_start,
  current_period_end = excluded.current_period_end,
  cancel_at_period_end = excluded.cancel_at_period_end;

insert into public.onboarding_state (user_id, current_step, completed_steps, demo_mode, selected_plan, youtube_channel_id, channel_id, is_complete, last_seen_at)
values (
  '00000000-0000-4000-8000-000000000001',
  'ready',
  '{"welcome","youtube","plan","processing","ready"}',
  true,
  'pro',
  'UCDEMO001',
  '11111111-1111-4111-8111-111111111111',
  true,
  now()
)
on conflict (user_id) do update set
  current_step = excluded.current_step,
  completed_steps = excluded.completed_steps,
  demo_mode = excluded.demo_mode,
  selected_plan = excluded.selected_plan,
  youtube_channel_id = excluded.youtube_channel_id,
  channel_id = excluded.channel_id,
  is_complete = excluded.is_complete,
  last_seen_at = excluded.last_seen_at;

insert into public.videos (id, channel_id, youtube_video_id, title, description, thumbnail_url, published_at, view_count, travel_type, location_status, source_payload)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'demojp001aa1', 'Kyoto al amanecer: templos, trenes y cafeterias', 'Ruta cultural por Kyoto.', null, '2025-01-12T10:00:00Z', 214000, 'cultural', 'mapped', '{}'::jsonb),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '11111111-1111-4111-8111-111111111111', 'demojp002aa2', '24 horas en Tokio con presupuesto real', 'Exploracion urbana en Tokyo.', null, '2025-02-06T10:00:00Z', 187000, 'city_break', 'mapped', '{}'::jsonb),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', '11111111-1111-4111-8111-111111111111', 'demoes001aa3', 'Ruta secreta por Lisboa y Sintra', 'Portugal en modo editorial.', null, '2024-11-03T10:00:00Z', 143000, 'cultural', 'mapped', '{}'::jsonb),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', '11111111-1111-4111-8111-111111111111', 'demoes002aa4', 'Madrid foodie guide sin trampas turisticas', 'Comida, barrio y presupuesto.', null, '2024-09-18T10:00:00Z', 119000, 'food', 'mapped', '{}'::jsonb),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', '11111111-1111-4111-8111-111111111111', 'demoes003aa5', 'Barcelona: barrios, metro y spots locales', 'Recorrido urbano.', null, '2024-10-26T10:00:00Z', 131000, 'city_break', 'mapped', '{}'::jsonb),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6', '11111111-1111-4111-8111-111111111111', 'demonz001aa6', 'Camperlife en Nueva Zelanda - etapa norte', 'Ruta road trip.', null, '2025-03-02T10:00:00Z', 98000, 'road_trip', 'mapped', '{}'::jsonb),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7', '11111111-1111-4111-8111-111111111111', 'demonz002aa7', 'Senderos en Queenstown con clima extremo', 'Aventura y paisaje.', null, '2025-03-22T10:00:00Z', 86000, 'adventure', 'mapped', '{}'::jsonb),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8', '11111111-1111-4111-8111-111111111111', 'demoma001aa8', 'Marruecos real: medina, riads y desierto', 'Viaje cultural.', null, '2024-12-12T10:00:00Z', 175000, 'cultural', 'mapped', '{}'::jsonb),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9', '11111111-1111-4111-8111-111111111111', 'demoar001aa9', 'Mendoza: vino, montaña y budget local', 'Argentina con foco local.', null, '2024-08-10T10:00:00Z', 104000, 'nature', 'mapped', '{}'::jsonb),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10', '11111111-1111-4111-8111-111111111111', 'demoar002ab0', 'Buenos Aires en 48h: ruta por barrios', 'City break editorial.', null, '2024-07-01T10:00:00Z', 112000, 'city_break', 'mapped', '{}'::jsonb),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11', '11111111-1111-4111-8111-111111111111', 'demois001ab1', 'Islandia en invierno: guia de ruta segura', 'Road trip en clima extremo.', null, '2025-01-28T10:00:00Z', 93000, 'road_trip', 'mapped', '{}'::jsonb),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12', '11111111-1111-4111-8111-111111111111', 'demous001ab2', 'Nueva York low-cost: checklist completo', 'Guia urbana.', null, '2024-06-20T10:00:00Z', 156000, 'city_break', 'mapped', '{}'::jsonb)
on conflict (channel_id, youtube_video_id) do update set
  title = excluded.title,
  description = excluded.description,
  thumbnail_url = excluded.thumbnail_url,
  published_at = excluded.published_at,
  view_count = excluded.view_count,
  travel_type = excluded.travel_type,
  location_status = excluded.location_status,
  source_payload = excluded.source_payload;

delete from public.video_locations
where channel_id = '11111111-1111-4111-8111-111111111111';

insert into public.video_locations (id, channel_id, video_id, is_primary, country_code, country_name, location_label, city, region, lat, lng, confidence_score, travel_type, source, raw_payload)
values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', true, 'JP', 'Japan', 'Kyoto', 'Kyoto', 'Kansai', 35.0116, 135.7681, 0.950, 'cultural', 'gemini', '{}'::jsonb),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', true, 'JP', 'Japan', 'Tokyo', 'Tokyo', 'Kanto', 35.6764, 139.6500, 0.920, 'city_break', 'gemini', '{}'::jsonb),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', true, 'PT', 'Portugal', 'Lisbon', 'Lisbon', 'Lisbon', 38.7223, -9.1393, 0.900, 'cultural', 'gemini', '{}'::jsonb),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', true, 'ES', 'Spain', 'Madrid', 'Madrid', 'Madrid', 40.4168, -3.7038, 0.880, 'food', 'gemini', '{}'::jsonb),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', true, 'ES', 'Spain', 'Barcelona', 'Barcelona', 'Catalonia', 41.3874, 2.1686, 0.890, 'city_break', 'gemini', '{}'::jsonb),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa6', true, 'NZ', 'New Zealand', 'Auckland', 'Auckland', 'Auckland', -36.8485, 174.7633, 0.910, 'road_trip', 'gemini', '{}'::jsonb),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb7', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa7', true, 'NZ', 'New Zealand', 'Queenstown', 'Queenstown', 'Otago', -45.0312, 168.6626, 0.900, 'adventure', 'gemini', '{}'::jsonb),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb8', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa8', true, 'MA', 'Morocco', 'Marrakesh', 'Marrakesh', 'Marrakesh-Safi', 31.6295, -7.9811, 0.930, 'cultural', 'gemini', '{}'::jsonb),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb9', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9', true, 'AR', 'Argentina', 'Mendoza', 'Mendoza', 'Mendoza', -32.8895, -68.8458, 0.870, 'nature', 'gemini', '{}'::jsonb),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbba0', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa10', true, 'AR', 'Argentina', 'Buenos Aires', 'Buenos Aires', 'Buenos Aires', -34.6037, -58.3816, 0.890, 'city_break', 'gemini', '{}'::jsonb),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbba1', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11', true, 'IS', 'Iceland', 'Reykjavik', 'Reykjavik', 'Capital Region', 64.1466, -21.9426, 0.920, 'road_trip', 'gemini', '{}'::jsonb),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbba2', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa12', true, 'US', 'United States', 'New York', 'New York', 'New York', 40.7128, -74.0060, 0.850, 'city_break', 'gemini', '{}'::jsonb);

insert into public.sponsors (id, user_id, brand_name, logo_url, website_url, affiliate_url, discount_code, description, active)
values
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', '00000000-0000-4000-8000-000000000001', 'Nomad Gear', null, 'https://example.com/nomad-gear', 'https://example.com/nomad-gear', 'PUPILA10', 'Mochilas tecnicas y kits ultralight para viajes largos.', true),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', '00000000-0000-4000-8000-000000000001', 'RailPass Japan', null, 'https://example.com/railpass-japan', 'https://example.com/railpass-japan', 'TOKYO5', 'Pases de tren y eSIM para rutas por Japon.', true),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', '00000000-0000-4000-8000-000000000001', 'Andes Outdoor', null, 'https://example.com/andes-outdoor', 'https://example.com/andes-outdoor', 'ANDES12', 'Equipamiento de trekking para Mendoza y Patagonia.', true)
on conflict (id) do update set
  brand_name = excluded.brand_name,
  website_url = excluded.website_url,
  affiliate_url = excluded.affiliate_url,
  discount_code = excluded.discount_code,
  description = excluded.description,
  active = excluded.active;

insert into public.sponsor_geo_rules (sponsor_id, country_code, priority)
values
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc1', null, 0),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc2', 'JP', 10),
  ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'AR', 10)
on conflict (sponsor_id, country_code) do update set
  priority = excluded.priority;

insert into public.channel_monthly_metrics (channel_id, metric_month, total_countries, total_mapped_videos, total_views, monthly_visitors)
values
  ('11111111-1111-4111-8111-111111111111', '2025-03-01', 8, 12, 1618000, 94200)
on conflict (channel_id, metric_month) do update set
  total_countries = excluded.total_countries,
  total_mapped_videos = excluded.total_mapped_videos,
  total_views = excluded.total_views,
  monthly_visitors = excluded.monthly_visitors;

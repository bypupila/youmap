insert into public.subscription_plans (slug, name, price_usd, polar_product_id, polar_price_id, max_videos, max_sponsors, features, is_active)
values
  ('free', 'Free', 0, null, null, 50, 0, '["1 canal","Hasta 50 videos","Mapa publico","Importacion basica"]'::jsonb, true),
  ('creator', 'Creator', 29, null, null, null, 1, '["Videos ilimitados","1 sponsor","Analytics basicos"]'::jsonb, true),
  ('creator_pro', 'Creator Pro', 79, null, null, null, 3, '["Multi-canal","Sponsor hub","Sync prioritaria"]'::jsonb, true),
  ('agency', 'Agency', 199, null, null, null, null, '["Portafolio de canales","API","Soporte dedicado"]'::jsonb, true),
  ('starter', 'Starter', 29, null, null, 100, 1, '["Hasta 100 videos","1 sponsor","Analytics basico"]'::jsonb, true),
  ('pro', 'Pro', 79, null, null, null, 3, '["Videos ilimitados","3 sponsors","Analytics avanzado"]'::jsonb, true),
  ('creator_plus', 'Creator+', 199, null, null, null, null, '["Todo Pro","Sponsors ilimitados","White label"]'::jsonb, true)
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

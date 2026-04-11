# Local Setup

## Prerequisites

- Node.js 20+
- Supabase project or local Supabase CLI
- Polar test credentials if you want to exercise billing

## Start the app

```bash
npm install
npm run dev
```

## Bootstrap Supabase

If the Supabase CLI is available and the project is linked, run:

```bash
./scripts/bootstrap-local.sh
```

That script applies the SQL migration and loads the demo seed in order.

## Demo flow

Use the demo route to inspect the product without external credentials:

- `/onboarding?demo=1`
- `/dashboard?channelId=demo-channel&demo=1`
- `/u/demo`

## Supabase setup

1. Apply `supabase/migrations/0001_initial.sql`.
2. Load `supabase/seed/demo.sql`.
3. Set `NEXT_PUBLIC_SUPABASE_URL`.
4. Set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Set `SUPABASE_SERVICE_ROLE_KEY`.
6. Set `GEMINI_API_KEY`, `YOUTUBE_API_KEY`, `POLAR_ACCESS_TOKEN` and `POLAR_WEBHOOK_SECRET`.
7. Load real Polar product and price IDs into `subscription_plans.polar_product_id` and `subscription_plans.polar_price_id`.

## Verification order

1. Login works.
2. Demo flow renders the globe.
3. Analytics endpoint returns data.
4. Public map renders videos.
5. Sponsor click tracking works.
6. Polar checkout and webhook persist a subscription.

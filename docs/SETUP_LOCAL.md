# Local Setup

## Prerequisites

- Node.js 20+
- Neon Postgres database
- Polar test credentials if you want to exercise billing

## Start the app

```bash
npm install
npm run security:install-hooks
npm run dev
```

## Bootstrap Neon

With `DATABASE_URL` set in `.env.local`, run:

```bash
./scripts/bootstrap-local.sh
```

That script delegates to `scripts/bootstrap-neon.mjs` and applies Neon SQL migration and seed in order.

## Demo flow

Use the demo route to inspect the product without external credentials:

- `/onboarding?demo=1`
- `/dashboard?channelId=demo-channel&demo=1`
- `/u/demo`

## Neon setup

1. Set `DATABASE_URL`.
2. Set `AUTH_SESSION_SECRET`.
3. Apply `neon/migrations/0001_initial.sql` and `neon/seed/demo.sql` via `./scripts/bootstrap-local.sh`.
4. Set `YOUTUBE_API_KEY`, one Gemini key (`GOOGLE_GENAI_API_KEY` or `GEMINI_API_KEY` or `GOOGLE_API_KEY`), `POLAR_ACCESS_TOKEN` and `POLAR_WEBHOOK_SECRET`.
5. Load real Polar product and price IDs into `subscription_plans.polar_product_id` and `subscription_plans.polar_price_id`.

No external CLI or linked project is required for local bootstrap anymore.

## Secret safety checks

Before pushing changes:

```bash
npm run security:secrets
```

Only `.env.example` can be committed. Keep real credentials only in local `.env.local` or provider env settings.

## Verification order

1. Login works.
2. Demo flow renders the globe.
3. Analytics endpoint returns data.
4. Public map renders videos.
5. Sponsor click tracking works.
6. Polar checkout and webhook persist a subscription.

## Vercel checklist

For stable deploys, configure this in Vercel Project Settings:

1. Production branch: `main`.
2. Git integration enabled with your GitHub repo.
3. Environment variables for `Production` and `Preview`:
   - `NEXT_PUBLIC_APP_URL`
   - `DATABASE_URL`
   - `AUTH_SESSION_SECRET` (or `SESSION_SECRET`)
   - `YOUTUBE_API_KEY`
   - `GOOGLE_GENAI_API_KEY` (or `GEMINI_API_KEY` / `GOOGLE_API_KEY`)
   - `NOMINATIM_USER_AGENT`
   - `NOMINATIM_EMAIL`
4. Optional billing envs if checkout is enabled:
   - `POLAR_ACCESS_TOKEN`
   - `POLAR_WEBHOOK_SECRET`
   - `POLAR_TRIAL_DISCOUNT_ID`

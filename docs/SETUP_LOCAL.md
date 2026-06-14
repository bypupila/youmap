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

The private creator panel also shows Business OS readiness. If it reports missing required capabilities, apply the database migrations before testing sponsor reports, Media Kit, CRM, brand portals, or scheduled reports.

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
5. (Optional but recommended for cron worker) set `YOUTUBE_IMPORT_WORKER_TOKEN`.
6. (Optional tuning) set `YOUTUBE_IMPORT_CONCURRENCY` and `YOUTUBE_IMPORT_MAX_VIDEOS_PER_RUN`.
7. (Required in production for Vercel cron GET auth) set `CRON_SECRET`.
8. (Optional for manual/external poll close calls) set `MAP_POLLS_CRON_TOKEN`.
9. (Optional for automatic sponsor report emails) set `RESEND_API_KEY` and `REPORT_EMAIL_FROM`.
10. (Optional for isolated brand portal access cookies) set `BRAND_PORTAL_ACCESS_SECRET`; otherwise `AUTH_SESSION_SECRET` is reused.
11. `neon/seed/demo.sql` ya carga los Polar product/price IDs del snapshot de lanzamiento para `starter`, `pro` y `creator_plus`. Si el catálogo de Polar cambia, refrescalos con `npm run polar:bootstrap` usando credenciales validas antes de volver a ejecutar el seed.

No external CLI or linked project is required for local bootstrap anymore.

## Secret safety checks

Before pushing changes:

```bash
npm run security:secrets
```

Before release (or after incident response), also run:

```bash
npm run security:history
```

Only `.env.example` can be committed. Keep real credentials only in local `.env.local` or provider env settings.

## Verification order

1. Login works.
2. Demo flow renders the globe.
3. Analytics endpoint returns data.
4. Public map renders videos.
5. Sponsor click tracking works.
6. Polar checkout and webhook persist a subscription.
7. YouTube import creates a queued run in `/api/youtube/import/start` and is processed by `/api/youtube/import/worker`.
8. `/creator-panel` shows Business OS readiness as ready after migrations, with email automatico marked optional when Resend is not configured.

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
5. Optional import worker envs:
   - `YOUTUBE_IMPORT_WORKER_TOKEN`
   - `YOUTUBE_IMPORT_CONCURRENCY`
   - `YOUTUBE_IMPORT_MAX_VIDEOS_PER_RUN`
6. Optional poll worker env:
   - `CRON_SECRET` (required in production if Vercel cron is enabled)
   - `MAP_POLLS_CRON_TOKEN` (optional for manual external invocations)
7. Optional sponsor report email env:
   - `RESEND_API_KEY`
   - `REPORT_EMAIL_FROM`
   - `SPONSOR_REPORTS_CRON_TOKEN` (optional for manual external invocations of `/api/sponsors/reports/schedules/run`)
8. Optional brand portal env:
   - `BRAND_PORTAL_ACCESS_SECRET` (optional; falls back to `AUTH_SESSION_SECRET` or `SESSION_SECRET`)

## Poll close cron

- Cron route: `GET /api/map/polls/close-expired`.
- `vercel.json` currently schedules this daily at `0 6 * * *` (06:00 UTC).
- In production, cron GET requires `Authorization: Bearer <CRON_SECRET>`.
- No authorization by `user-agent`.
- If `MAP_POLLS_CRON_TOKEN` is set, manual/externals can auth via query `?token=...`, `x-cron-token`, or `Authorization: Bearer <MAP_POLLS_CRON_TOKEN>`.

## Sponsor report schedules

- Manual/cron runner route: `GET|POST /api/sponsors/reports/schedules/run`.
- The runner is also called by the existing `GET /api/youtube/data-expiry/sweep` cron so `vercel.json` stays within the two-cron Hobby limit.
- In production, cron GET requires `Authorization: Bearer <CRON_SECRET>`.
- If `SPONSOR_REPORTS_CRON_TOKEN` is set, manual/externals can auth via query `?token=...`, `x-cron-token`, or `Authorization: Bearer <SPONSOR_REPORTS_CRON_TOKEN>`.
- Automatic email sending requires `RESEND_API_KEY` and `REPORT_EMAIL_FROM`; without them, schedules still generate report links and expose the missing-email configuration as `last_error`.

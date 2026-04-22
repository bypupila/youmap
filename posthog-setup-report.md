<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into this Next.js 16 App Router project. The following changes were made:

- **`instrumentation-client.ts`** (new) — Client-side observability hook that initializes PostHog and Sentry before hydration, using the `instrumentation-client.ts` pattern for Next.js 15.3+ and the reverse proxy configured at `/ingest`.
- **`src/lib/posthog-server.ts`** (new) — Server-side PostHog client using `posthog-node`, with lazy singleton initialization.
- **`next.config.mjs`** — Added `/ingest` reverse proxy rewrites for PostHog (static, array, and event ingestion paths) and `skipTrailingSlashRedirect: true`.
- **`.env.local`** — Added `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` environment variables.
- **`package.json`** — `posthog-js` and `posthog-node` installed as dependencies.

## Events instrumented

| Event | Description | File |
|---|---|---|
| `user_registered` | A new user successfully completed registration | `src/app/api/auth/register/route.ts` |
| `user_logged_in` | A user successfully authenticated with email/username and password | `src/app/api/auth/login/route.ts` |
| `checkout_initiated` | A user was redirected to the Polar checkout page for a subscription plan | `src/app/api/billing/polar/checkout/route.ts` |
| `subscription_activated` | A subscription became active or trialing via the Polar webhook | `src/app/api/billing/polar/webhook/route.ts` |
| `map_country_selected` | A visitor selected a country on the travel map globe | `src/components/map/map-experience.tsx` |
| `map_video_opened` | A visitor opened the video carousel by clicking a video in the map | `src/components/map/map-experience.tsx` |
| `map_share_url_copied` | The map owner copied the public share URL to clipboard | `src/components/map/map-experience.tsx` |
| `map_refreshed` | The map owner triggered a YouTube channel sync from the map panel | `src/components/map/map-experience.tsx` |
| `poll_vote_submitted` | A visitor submitted a destination vote on the fan vote poll | `src/components/map/fan-vote-card.tsx` |
| `poll_published` | A map owner published a fan vote poll as live | `src/components/map/fan-vote-card.tsx` |
| `video_youtube_opened` | A visitor clicked 'Ver video' to open the YouTube video in a new tab | `src/components/map/video-carousel-dialog.tsx` |
| `onboarding_plan_selected` | A user selected a subscription plan during the onboarding flow | `src/components/onboarding/onboarding-flow.tsx` |

User identification (`posthog.identify`) is called server-side on both login and registration with `userId` as the distinct ID, along with `email`, `username`, and `display_name` as person properties.

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/392733/dashboard/1497150
- **Registration → Checkout → Subscription funnel**: https://us.posthog.com/project/392733/insights/f54K06zZ
- **New user registrations over time**: https://us.posthog.com/project/392733/insights/VJrHV43h
- **Map engagement: country selections & video opens**: https://us.posthog.com/project/392733/insights/OAnpYp5j
- **Fan poll votes over time**: https://us.posthog.com/project/392733/insights/Jf4SEuDk
- **Onboarding plan selection breakdown**: https://us.posthog.com/project/392733/insights/UfHP0yhN

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>

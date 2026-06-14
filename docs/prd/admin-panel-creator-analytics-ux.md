# Admin Panel Creator Analytics UX PRD

## Problem Statement

El creador de viajes necesita un panel privado que le diga que hacer con su mapa, su contenido y sus oportunidades comerciales. El panel actual del creador muestra algunas metricas utiles, pero la informacion esta fragmentada, demasiado tecnica y no prioriza decisiones. Un influencer no solo necesita ver datos parecidos a YouTube Console; necesita entender que paises funcionan en su mapa, que videos abren los usuarios, que destinos deberia empujar, donde hay inventario comercial sin sponsor, que contenido falta corregir y que acciones mejoran productividad.

## Solution

Reemplazar la experiencia actual del `Panel del creador` por una version elevada del panel avanzado existente. El nuevo panel debe ser la experiencia principal para creadores: sidebar claro, resumen accionable, salud del mapa, videos, paises, votaciones, sponsors, `Metricas del mapa`, actividad y una `Accion prioritaria` visible. La UI debe distinguir datos de YouTube de datos first-party de Travel Your Map y convertirlos en lectura operacional simple.

## User Stories

1. As a travel creator, I want one main private panel, so that I do not need to choose between duplicate admin experiences.
2. As a travel creator, I want to see the health of my map first, so that I know whether it is ready to share.
3. As a travel creator, I want an accion prioritaria at the top, so that I know the most important next step.
4. As a travel creator, I want to see pending videos immediately, so that I can fix content that weakens the map.
5. As a travel creator, I want videos grouped by status and country, so that I can review large catalogs efficiently.
6. As a travel creator, I want to edit a video's country, city, visibility, featured state and notes, so that my map stays accurate.
7. As a travel creator, I want to see YouTube-derived performance beside map behavior, so that I can compare reach with actual map usage.
8. As a travel creator, I want map metrics labeled as Travel Your Map data, so that I do not confuse them with YouTube Analytics.
9. As a travel creator, I want top countries by map interaction, so that I can identify demand from my audience.
10. As a travel creator, I want top videos opened from the map, so that I know which map content attracts attention.
11. As a travel creator, I want sponsor clicks visible in the same workflow, so that I can understand monetization performance.
12. As a travel creator, I want countries to show whether they are monetized, so that I can find sponsor opportunities.
13. As a travel creator, I want a country detail panel, so that I can decide whether to create a sponsor or poll for that destination.
14. As a travel creator, I want to create a poll from the panel, so that I can convert audience intent into travel decisions.
15. As a travel creator, I want poll results and conversion actions visible, so that votes become destinations, not passive data.
16. As a travel creator, I want sponsor management in the panel, so that commercial actions live near map inventory.
17. As a travel creator, I want active sponsors, scopes and pauses visible, so that I know what appears on the public map.
18. As a travel creator, I want a recent activity timeline, so that I can audit what changed.
19. As a travel creator, I want sync status visible, so that I know whether YouTube and map data are fresh.
20. As a travel creator, I want alerts in plain language, so that operational problems are understandable.
21. As a travel creator, I want the panel to work on mobile, so that I can check or fix the map while traveling.
22. As a travel creator, I want dense desktop views, so that repeated admin work is fast.
23. As a travel creator, I want the public map link always available, so that I can validate the published experience.
24. As a superadmin managing creators, I want the same creator panel to respect permissions, so that creator data stays private.
25. As a product owner, I want the old creator panel replaced, so that logic and UX are not duplicated.

## Implementation Decisions

- Promote the advanced creator admin surface to the main `Panel del creador`.
- Reuse the existing creator admin payload model for videos, countries, sponsors, polls, audience, sync status, activity, alerts and summary.
- Reuse existing map-admin APIs for video edits, poll actions and sponsor actions.
- Keep private panels noindex.
- Keep route authorization based on creator ownership or superadmin manage access.
- Add a configurable panel base route so the reusable panel can run as the primary creator route while any proposal route can continue to exist temporarily.
- Improve summary and audience sections to clearly label YouTube-derived metrics versus `Metricas del mapa`.
- Surface map usage as first-party insights: map interactions by country, videos opened from the map, sponsor clicks, poll votes and operational activity.
- Preserve the existing global superadmin administration page as a separate operational surface.
- Avoid schema changes for this iteration.

## Testing Decisions

- Use TypeScript and lint as baseline checks for route, component and contract regressions.
- Use the highest available UI seam: open the private creator panel route in a browser and verify desktop and mobile layouts.
- Test route behavior by ensuring creator panel resolves to the advanced panel experience and preserves query navigation across tabs.
- Test visible behavior rather than component internals: tab navigation, public map link, alerts, summary, audience panels, mobile sidebar and modal access.
- Verify that existing map-admin API contracts remain unchanged by running build or type checks after modifications.

## Out of Scope

- New database schema or migrations.
- Full YouTube Analytics OAuth integration beyond already stored YouTube-derived fields.
- Billing, sponsor marketplace, pricing or payout features.
- Rebuilding the public map experience.
- Removing the superadmin global administration page.
- Publishing the PRD to an external issue tracker.

## Further Notes

The issue tracker is not configured in this workspace, so this PRD is stored locally. The implementation should keep momentum by promoting existing working surfaces instead of creating a second analytics/dashboard system.

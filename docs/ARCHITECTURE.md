# Architecture

## Overview

TravelYourMap se divide en cuatro capas:

1. Presentacion.
2. Estado del producto.
3. Persistencia.
4. Integraciones externas.

## Presentacion

- `src/app/page.tsx` es la home.
- `src/app/onboarding/page.tsx` cubre el alta.
- `src/app/dashboard/page.tsx` concentra analytics y sponsors.
- `src/app/u/[username]/page.tsx` renderiza la experiencia pública.

## Estado del producto

- `src/lib/demo-data.ts` centraliza el dataset demo.
- `src/lib/use-subscription.ts` consulta el estado de billing.
- `src/lib/types.ts` define las entidades principales.

## Persistencia

- Neon Postgres es la fuente de verdad.
- Los datos de usuarios, canales, videos, ubicaciones, sponsors y suscripciones deben persistirse en tablas separadas.
- El backend usa SQL server-side con `DATABASE_URL` y sesión HTTP-only.
- El esquema oficial vive en `neon/migrations` y el bootstrap local en `scripts/bootstrap-neon.mjs`.

## Integraciones

- YouTube para importacion de videos.
- Gemini para extracción de ubicaciones.
- Polar para billing.
- Auth propio basado en tabla `users` + `user_credentials` + cookie de sesión.

## Decisiones

- La URL publica por creador se resuelve con `username`.
- El globo debe verse dentro del flujo del creador, no solo en la pagina publica.
- El modo demo tiene que reutilizar el mismo flujo de componentes y APIs tanto como sea posible.

## Riesgos actuales

- Quedan cambios amplios sin commitear de la migración a Neon y eso eleva el riesgo de regresiones si se mezclan con trabajo nuevo.
- El auth propio por cookie depende completamente de `AUTH_SESSION_SECRET` y `DATABASE_URL`; cualquier desalineación entre entornos rompe login y middleware.
- Faltan tests de integración para login, onboarding, sync de mapa y billing sobre Neon.
- La documentación histórica del pipeline y skills todavía puede arrastrar conceptos del stack anterior si no se mantiene alineada.

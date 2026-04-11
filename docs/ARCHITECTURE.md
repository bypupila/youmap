# Architecture

## Overview

TravelMap se divide en cuatro capas:

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

- Supabase es la fuente de verdad.
- Los datos de usuarios, canales, videos, ubicaciones, sponsors y suscripciones deben persistirse en tablas separadas.
- El backend usa `service role` solo para consultas administrativas y reports.

## Integraciones

- YouTube para importacion de videos.
- Gemini para extracción de ubicaciones.
- Polar para billing.
- Supabase Auth para login.

## Decisiones

- La URL publica por creador se resuelve con `username`.
- El globo debe verse dentro del flujo del creador, no solo en la pagina publica.
- El modo demo tiene que reutilizar el mismo flujo de componentes y APIs tanto como sea posible.

## Riesgos actuales

- Falta el esquema SQL real.
- Falta la importacion de YouTube.
- Falta el pipeline de ubicaciones.
- Falta la persistencia del onboarding.
- Falta cerrar el billing con Polar.

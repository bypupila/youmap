# Implementation Plan

Este documento resume la ruta técnica para llevar el repo a un producto funcional.

Para la planificación actual de lanzamiento MVP, ver `docs/MVP_ROADMAP.md`.

## Fase 1. Base de datos

Objetivo: dejar el contrato de datos listo para auth, canales, videos, ubicaciones, sponsors y billing.

Entregables:

- Migraciones SQL.
- Índices y constraints.
- RLS por propiedad del dato.
- RPCs de analytics.
- Seed demo.

## Fase 2. Auth y onboarding

Objetivo: que el usuario entre, conecte su canal y vea su estado de onboarding en una sesión persistida.

Entregables:

- Login Google.
- Perfil de usuario.
- Estados de onboarding.
- Redirección correcta según sesión y suscripción.

## Fase 3. Ingesta de YouTube

Objetivo: importar canal, videos y actualizaciones incrementales sin duplicar registros.

Entregables:

- Import inicial.
- Sync incremental.
- Manejo de cuotas y reintentos.
- Estado de importación visible en dashboard.

## Fase 4. Ubicaciones

Objetivo: convertir títulos y descripciones en pins geográficos confiables.

Entregables:

- Extracción con Gemini.
- Geocodificación.
- Revisión manual.
- Reintentos y trazabilidad de errores.

## Fase 5. Globo y experiencia pública

Objetivo: que el mapa sea el centro del producto, no una pantalla aislada.

Entregables:

- Globo visible dentro del onboarding.
- Globo visible dentro del dashboard.
- Mapa público con metadata SEO.
- Estados vacíos y loading correctos.

## Fase 6. Monetización

Objetivo: sponsors y Polar funcionando con control de acceso por plan.

Entregables:

- Checkout real.
- Webhook robusto.
- Sponsors por país.
- Tracking de clicks.
- Planes y límites.

## Fase 7. Operación

Objetivo: poder mantener el sistema sin romperlo en producción.

Entregables:

- Logs estructurados.
- Tests.
- Documentación.
- Seeds.
- Monitoreo básico.

## Criterio de cierre de MVP

El MVP está cerrado cuando un creador puede:

- entrar al sistema,
- conectar o simular su canal,
- importar contenido,
- ver ubicaciones y errores,
- publicar el globo,
- recibir sponsors,
- y cobrar con Polar.

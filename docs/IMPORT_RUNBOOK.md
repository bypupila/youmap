# Runbook de Importación YouTube (MVP)

## Objetivo

Resolver incidentes del pipeline de importación sin bloquear onboarding ni perder trazabilidad.

## Rutas operativas

- Encolar import: `POST /api/youtube/import/start`
- Estado del run: `GET /api/youtube/import/[runId]`
- Procesar cola (worker): `POST /api/youtube/import/worker`
- Métricas operativas: `GET /api/youtube/import/metrics`

## Señales clave del run

`channel_import_runs.output`:

- `stage`
- `progress`
- `totalVideos`
- `processedVideos`
- `mappedVideos`
- `skippedVideos`
- `providerErrors`

Estados:

- `queued`
- `running`
- `completed`
- `failed`

## Triage rápido

1. Validar que exista `runId` y que el usuario tenga canal asociado.
2. Verificar `status` y `updated_at` del run.
3. Si está `queued` o `running` sin avance, ejecutar worker manual.
4. Revisar `providerErrors` para identificar proveedor dominante.
5. Confirmar resultado en mapa y cola manual.

## Incidentes frecuentes

### 1) Run queda en `queued`

- Acción:
  - Ejecutar `POST /api/youtube/import/worker` (autenticado o con token interno).
  - Revisar credenciales mínimas (`YOUTUBE_API_KEY`, `DATABASE_URL`).

### 2) Run queda en `running` sin progreso

- Acción:
  - Esperar ventana de stale.
  - Reejecutar worker; el claim toma runs stale automáticamente.

### 3) Alta tasa de `needs_manual`

- Acción:
  - Revisar `providerErrors.nominatim` y señales de geocoding.
  - Ejecutar segunda verificación (`/api/map/second-check`) en canales con cola manual grande.

### 4) Fallos recurrentes de YouTube API

- Acción:
  - Verificar cuota y límites del proyecto.
  - Confirmar key activa y sin restricciones incompatibles.
  - Reintentar run desde cola (idempotencia por `youtube_video_id`).

## Criterios de cierre

- Run pasa a `completed`.
- `progress` llega a `1`.
- Mapa refleja datos consistentes.
- Cola manual queda en umbral aceptable para canal objetivo.

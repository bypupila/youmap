# Go / No-Go Checklist (MVP Beta)

Fecha base: 2026-04-28
Ultima actualizacion: 2026-05-25

## 1) Calidad de build

- [ ] `npm run lint` en verde.
- [ ] `npm run build` en verde.
- [ ] `npm run validate:env` en verde en entorno objetivo.
- [ ] Sin errores críticos de runtime en `/`, `/onboarding`, `/onboarding/processing`, `/map`, `/explore`, `/u/demo`.

## 2) Flujo de onboarding e import

- [ ] `POST /api/youtube/import/start` solo encola run y devuelve `import_run_id`.
- [ ] Worker ejecuta run desde cola (`POST /api/youtube/import/worker`).
- [ ] Polling de `/api/youtube/import/[runId]` refleja progreso real `0..1` y `stage`.
- [ ] `channel_import_runs.output` incluye `providerErrors`.
- [ ] No hay bloqueo por keys opcionales de Gemini en flujo principal.

## 3) Calidad de datos de mapa

- [ ] Shorts excluidos por defecto.
- [ ] Ubicación conservadora: sin inventar ciudad en evidencia débil.
- [ ] `needs_manual` visible y utilizable.
- [ ] Reproceso no deja puntos viejos (stale) en `video_locations`.

## 4) UX pública

- [ ] No se muestran CTAs `TEST` en producción sin flag explícito.
- [ ] `/map` muestra etiqueta correcta (`Mapa público`, `Mapa demo`).
- [ ] Sin textos de placeholder tipo `No thumbnail` en superficies principales.
- [ ] Copys críticos en español en sesión principal.

## 5) SEO técnico mínimo

- [ ] Metadata dinámica en `/u/[username]`.
- [ ] `sitemap.xml` publicado.
- [ ] `robots.txt` publicado y alineado con rutas públicas.
- [ ] Canonical de perfil público correcto.

## 6) Observabilidad y gate

- [ ] Métricas de import por usuario disponibles (`/api/youtube/import/metrics`).
- [ ] Success rate de import en muestra beta >= 95%.
- [ ] Cero bloqueos críticos en onboarding/mapa.

## 7) Sponsors y operación masiva

- [ ] `POST /api/map-admin/sponsors/bulk-assign` funciona con preview y motivo obligatorio.
- [ ] Lotes grandes quedan en cola y se procesan por worker (`/api/map-admin/sponsors/bulk-assign/worker`).
- [ ] Estado de job visible (`/api/map-admin/sponsors/bulk-assign/jobs/[jobId]`).
- [ ] Flujo de deshacer operativo (`/api/map-admin/sponsors/bulk-assign/jobs/[jobId]/undo`) dentro de ventana válida.
- [ ] `sponsor_detection_status` consistente al confirmar sponsor manualmente.

## 8) Registro viewer y cumplimiento

- [ ] Registro viewer obligatorio para votar (`/api/map/fan-votes/vote` y `/api/map/polls/[pollId]/vote` devuelven `401` sin sesión).
- [ ] Registro viewer exige país y ciudad.
- [ ] Consentimiento de funcionamiento persiste con versión legal.
- [ ] Revocación de consentimientos promocionales operativa.
- [ ] Eliminación de cuenta viewer (`DELETE /api/auth/viewer-account`) deja trazabilidad en `viewer_account_deletions`.

## 9) Votaciones país -> ciudades

- [ ] Cierre de votación país crea borrador de ciudades idempotente.
- [ ] Catálogo de ciudades sugeridas sale del catálogo global por país (no sólo de videos).
- [ ] Validación de ciudad acepta nombres canonizados por país (sin duplicados por acentos/mayúsculas).

## 10) Demo y modo lectura

- [ ] Demo muestra `Modo demo · sin persistencia` y no escribe cambios en backend.
- [ ] CTA de conversión desde demo a registro real visible y funcional.
- [ ] Canal público `by.pupila` forzado en modo viewer (sin edición pública).

## 11) Analítica MVP

- [ ] Dashboard creador muestra origen de métrica (YouTube vs Travel Your Map).
- [ ] Dashboard admin y creador soportan filtros `7/30/90/180 días`.
- [ ] Métricas internas mínimas visibles: `map_view`, `video_panel_open`, `poll_vote`, `sponsor_click`.
- [ ] Métricas internas de engagement visibles: guardados, favoritos, ver más tarde, horas reproducidas en Travel Your Map.

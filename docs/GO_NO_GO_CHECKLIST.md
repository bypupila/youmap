# Go / No-Go Checklist (MVP Beta)

Fecha base: 2026-04-28

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

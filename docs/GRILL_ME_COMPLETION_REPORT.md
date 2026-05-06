# Grill Me Completion Report

Fecha: 2026-05-01

Este documento cierra el bloque de decisiones trabajado con el skill Grill Me para mapas, roles contextuales, votaciones, demo sandbox y operacion superadmin.

## Objetivo acordado

- Todos los mapas comparten el mismo layout base: header, panel izquierdo, globo/contenido central, modulo inferior y panel derecho.
- Lo que cambia por contexto no es la estructura visual, sino la capacidad funcional.
- `demo` y `creator` comparten la misma UX administrativa visible.
- `viewer` consume contenido: puede guardar videos, votar y ver resultados segun autenticacion, pero no editar cards operativas.
- No existe selector global `influencer/viewer` en `/auth`; el rol se resuelve por contexto del mapa.
- Si un creator entra a un mapa ajeno, opera como `viewer`.

## Estado implementado

### Layout y roles

- `MapExperience` mantiene el shell compartido para `demo`, `creator` y `viewer`.
- `viewer` no ve acciones de edicion en sponsors ni cards operativas.
- `creator` y `demo` mantienen la misma superficie de gestion.
- `superadmin` tiene acceso global operativo con `/admin`.
- El panel `/admin` lista usuarios con búsqueda/paginacion server-side, permite buscar por nombre/email/rol y cambiar roles inline.
- Los cambios de rol quedan auditados en `public.user_role_audit`.
- El historial de `public.user_role_audit` se puede exportar a CSV desde el panel de auditoria.
- Al cambiar el rol de un usuario se revocan sus sesiones previas mediante `public.user_session_revocations`.

### Votaciones

- `poll_mode` soporta `country` y `country_city`.
- `country_city` fuerza flujo de 2 pasos: pais y luego ciudad.
- El voto es irreversible por fingerprint/cookie.
- Solo puede existir una votacion `live` por mapa; publicar una nueva cierra la anterior.
- `closes_at` es opcional.
- El cierre automatico funciona por lazy close y cron.
- El cron de Vercel apunta a `/api/map/polls/close-expired` una vez al dia para ser compatible con Vercel Hobby.
- El cierre inmediato para viewers queda cubierto por lazy close al consultar/votar; en Vercel Pro se puede subir el cron a `*/5 * * * *`.
- Si una votacion expira, se cierra y se registra evento `poll_auto_closed`.
- El desempate usa prioridad via `sort_order` de paises y ciudades.
- En `country_city`, la publicacion valida que cada pais tenga al menos una ciudad.
- El popup se muestra una vez por sesion de pestana usando `sessionStorage`.
- El demo usa la misma UX que creator, pero sus cambios de votacion son sandbox/no persistentes.

### Gating de estadisticas

- Creator/demo ven estadisticas completas.
- Viewer anonimo en `live` no ve metricas numericas.
- Viewer anonimo en `closed` ve ganador/top sin numeros exactos y CTA de login.
- Viewer autenticado ve conteos, porcentajes y top.
- El CTA de login usa retorno a la URL actual con `next`.

### Sponsors demo

- Demo y creator comparten UX.
- Demo usa sponsors reales de ejemplo.
- Demo permite editar y resetear sin persistir en DB.
- Creator persiste sponsors reales via API.

## APIs y contratos tocados

- `POST /api/map/polls`: acepta `poll_mode`, `closes_at`, prioridad ordenada y valida reglas por modo.
- `POST /api/map/polls/[pollId]/vote`: soporta voto por pais o pais+ciudad, irreversible y con rate-limit `10/min` por `ip + pollId`.
- `GET /api/map/polls/[pollId]/results`: adapta detalle segun owner/auth/anon.
- `GET|POST /api/map/polls/close-expired`: cierre batch de expiradas.
- `POST /api/admin/users/role`: solo superadmin, cambia roles, audita y revoca sesiones previas del usuario cambiado.
- `/admin`: panel global superadmin.

## Archivos principales

- `src/components/map/map-experience.tsx`
- `src/components/map/fan-vote-card.tsx`
- `src/lib/map-polls.ts`
- `src/lib/map-public.ts`
- `src/app/api/map/polls/route.ts`
- `src/app/api/map/polls/[pollId]/vote/route.ts`
- `src/app/api/map/polls/[pollId]/results/route.ts`
- `src/app/api/map/polls/close-expired/route.ts`
- `src/app/admin/page.tsx`
- `src/components/admin/admin-users-panel.tsx`
- `src/components/admin/role-management-card.tsx`
- `src/components/admin/role-audit-panel.tsx`
- `src/lib/admin-role-audit.ts`
- `src/lib/session-revocations.ts`
- `src/lib/current-user.ts`
- `src/lib/auth-session.ts`
- `vercel.json`

## Pruebas realizadas

- `npm run lint`: OK.
- `npm run build`: OK.
- Smoke HTTP local: `/`, `/u/demo`, `/map?channelId=demo-channel` responden `200`.
- Smoke HTTP local: `/admin` sin sesion responde `307` a auth.
- Smoke HTTP local con `Host: travelyourmap.bypupila.com`: `/admin` queda reservado y redirige a auth, `/u/demo` responde `200`, `/demo` responde `200` como vanity username.
- Smoke HTTP local: `/admin` con cookie superadmin responde `200` y renderiza directorio/auditoria.
- Smoke HTTP local: `/api/map/polls/close-expired` responde `200` con `ok: true`.
- Deploy produccion Vercel: `dpl_2m8jQPTTUppqwoYFxYZuTQrFre1d`, alias `https://travelyourmap.bypupila.com`.
- Smoke produccion: `/`, `/u/demo`, `/demo`, `/map?channelId=demo-channel` responden `200`.
- Smoke produccion: `/admin` sin sesion responde `307`.
- Smoke produccion: `/api/map/polls/close-expired` sin token responde `401`, confirmando proteccion manual.
- Prueba HTTP de `/admin` con cookie superadmin: `200`, renderiza `Administracion global`, `Usuarios y roles`, `Administrar roles`.
- Prueba HTTP de cambio de rol por superadmin: `creator -> viewer -> creator` con respuesta `200`.
- Prueba de auditoria: entradas creadas en `public.user_role_audit`.
- Prueba de revocacion: cookie vieja del usuario modificado devuelve `401`; login nuevo vuelve a funcionar.
- Prueba de cierre automatico de votaciones: `/api/map/polls/close-expired` cerro encuesta vencida y devolvio el ID esperado.
- Evidencia visual Playwright previa en `output/playwright/phase2` y `output/playwright/phase3` para viewer anonimo/logueado en desktop/mobile.

## Estado actual

El bloque conversado en Grill Me queda implementado localmente y validado por build, lint, HTTP funcional y evidencia visual previa. Para produccion, el punto operativo que debe existir en Vercel es `MAP_POLLS_CRON_TOKEN` si se mantiene protegido el endpoint de cron. El codigo contiene el cron en `vercel.json` con frecuencia diaria por limite de Vercel Hobby.

## Pendientes fuera del alcance cerrado

- Si se sube a Vercel Pro, cambiar el cron de `0 6 * * *` a `*/5 * * * *`.
- Si el volumen de usuarios crece, mover `/admin` a paginacion/busqueda server-side.
- Auditoria exportable via CSV desde `public.user_role_audit` ya implementada.

# TravelMap - BY PUPILA

TravelMap convierte un canal de viajes en un globo 3D interactivo con analytics, sponsors contextuales y una URL pública por creador.

## Estado actual

- Landing, onboarding, dashboard, explore, perfil publico y `/map` usan la misma base `MapExperience` sobre globo fullscreen.
- Hay flujo demo funcional y flujo real con import de YouTube + geolocalizacion + persistencia en Neon Postgres.
- Auth actualizado:
  - login con `email` o `username` en `/auth`
  - onboarding captura `nombre + email + username + canal`
  - URL publica por creador en `/u/<username>`
  - en paso 6 hay activacion normal con Polar y opcion temporal `Procesar sin pago (TEST)`
- El mapa ya soporta:
  - 1 punto por video
  - fronteras de paises + hover de pais
  - leyenda por pais (desktop + drawer mobile)
  - pines individuales con anti-colision (sin cluster)
  - hover card de video con thumbnail, views, likes, comments, fecha y link
  - filtro temporal `30/90/365/Todos`
  - selector por pais + boton flotante para salir del pais
  - refresh manual incremental
  - cola de verificacion manual
  - popup de resumen por corrida
  - bloqueo de scroll de pagina mientras interactuas con zoom del mapa

## Reglas de extraccion (actual)

- Shorts se excluyen por defecto:
  - `duration_seconds <= 60`
  - `#shorts` solo si `duration_seconds <= 90`
- Priorizacion de ubicacion:
  1. `recordingDetails.location` de YouTube
  2. heuristicas de titulo/descripcion + Nominatim
  3. Gemini solo en ambiguos/baja confianza
- Filtro travel balanceado:
  - se incluye si hay al menos 1 señal fuerte (`recordingDetails`, playlist travel, o evidencia textual),
  - si no, se marca como no-travel y no entra al mapa.

## Flujo demo

1. Abre `/onboarding?demo=1`.
2. Completa el onboarding.
3. Entra al dashboard demo.
4. Abre `/u/demo` para ver el mapa público.
5. Abre `/map` para ver el mapa global de videos (demo Luisito local).

## Flujo real (cuenta + planes)

1. Abre `/onboarding`.
2. Paso 1: carga `nombre + email + username + canal`.
3. Paso 6:
   - `Pagar con Polar y activar`: crea cuenta con password, inicia sesión y redirige a checkout.
   - `Procesar sin pago (TEST)`: crea cuenta, activa trial de prueba e inicia extracción inmediatamente.
4. Luego puedes entrar por `/auth` usando email o username.

## Desarrollo

```bash
npm install
npm run dev
```

## Bootstrap de Neon

Con `DATABASE_URL` configurado en `.env.local`, ejecuta:

```bash
./scripts/bootstrap-local.sh
```

Ese script delega en `scripts/bootstrap-neon.mjs` y aplica migraciones + seed sobre Neon.

## Variables de entorno

Revisa `.env.example` para los valores obligatorios.

Minimo para pipeline real:

- `YOUTUBE_API_KEY`
- `GEMINI_API_KEY`
- `NOMINATIM_USER_AGENT`
- `NOMINATIM_EMAIL`
- `DATABASE_URL`
- `AUTH_SESSION_SECRET`

## Estructura

- `src/app`: rutas y API routes.
- `src/components`: UI reutilizable.
- `src/components/design-system`: primitives visuales compartidos (`FloatingTopBar`, pills, etc.).
- `src/components/ui`: componentes `shadcn` instalados como source code.
- `src/lib`: clientes, helpers, demo data y validación.
- `neon/migrations`: esquema SQL del proyecto.
- `neon/seed`: datos de prueba para desarrollo local.
- `data/processed`: datasets exportados (`json/csv`) para mapas locales.
- `scripts`: extracción local de canales y generación de datasets de demo.
- `docs/design-system.md`: reglas del sistema visual.
- `docs/apple-ui-principles.md`: traducción de principios Apple a parámetros implementables.
- `docs/PROJECT_MEMORY.md`: memoria viva de procesos de desarrollo, QA, operación y release.

## APIs de mapa (operacion)

- `GET /api/map/data?channelId=<id>`
- `POST /api/map/sync` body `{ channelId }`
- `GET /api/map/sync/:runId`
- `GET /api/map/manual-verify?channelId=<id>`
- `POST /api/map/manual-verify` body `{ channelId, videoId, country_code, city }`

## Siguiente fase recomendada

1. Aplicar `neon/migrations/0001_initial.sql` en todos los entornos Neon no inicializados.
2. Agregar polling de `runId` en frontend para progreso en tiempo real.
3. Endurecer tests de integración de sync incremental + manual verify.
4. Instrumentar métricas de costos (YouTube/Nominatim/Gemini) por corrida.

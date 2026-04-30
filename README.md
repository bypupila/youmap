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
   - `Procesar sin pago (TEST)`: crea cuenta, activa trial de prueba y sigue al mismo paso de procesamiento del flujo pago.
4. Luego puedes entrar por `/auth` usando email o username.

Control de QA para mostrar/ocultar la opción test en planes:

- `NEXT_PUBLIC_ENABLE_TEST_NO_PAYMENT=1` muestra `Procesar sin pago (TEST)`.
- `NEXT_PUBLIC_ENABLE_TEST_NO_PAYMENT=0` la oculta para lanzamiento.

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
- `GOOGLE_GENAI_API_KEY` (o `GEMINI_API_KEY` / `GOOGLE_API_KEY`)
- `NOMINATIM_USER_AGENT`
- `NOMINATIM_EMAIL`
- `DATABASE_URL`
- `AUTH_SESSION_SECRET`

Opcionales de facturacion Polar:

- `POLAR_ACCESS_TOKEN`
- `POLAR_WEBHOOK_SECRET`
- `POLAR_TRIAL_DISCOUNT_ID`

Opcionales para operacion de votaciones:

- `MAP_POLLS_CRON_TOKEN` (si se define, habilita auth por query/header para ejecuciones manuales)

Bootstrap recomendado para este proyecto (crea productos nuevos y sincroniza IDs en Neon):

```bash
npm run polar:bootstrap
```

Regla operativa: en esta cuenta de Polar, este proyecto nunca debe modificar productos existentes de otros proyectos; siempre debe crear productos nuevos dedicados para TravelMap.

Verificacion rapida local:

```bash
npm run validate:env
```

## Supply Chain Security

El repo ahora endurece la cadena de suministro con:

- Actions de GitHub fijados por commit SHA
- instalacion de dependencias sin lifecycle scripts en el workflow de seguridad
- politica minima de antiguedad para paquetes del lockfile
- Dependabot para npm y GitHub Actions

Checks disponibles:

```bash
npm run security:workflow-pinning
npm run security:deps-age
```

Detalle operativo y mitigaciones aplicadas: `docs/security-supply-chain.md`

## Seguridad de secretos

- Solo se permite commitear `.env.example`.
- Todos los `.env*` reales estan bloqueados por `.gitignore`.
- Escaneo manual de secretos:

```bash
npm run security:secrets
```

- Escaneo de historial git (manual o en CI):

```bash
npm run security:history
```

- Instala hook pre-push (una vez por clon):

```bash
npm run security:install-hooks
```

- Rotar secreto de sesion local:

```bash
npm run security:rotate-auth
```

Procedimiento de remediacion y rotacion: `docs/SECURITY_SECRETS.md`.

## Roles (RBAC)

- Roles persistidos en `public.users.role`: `viewer`, `creator`, `superadmin`.
- `creator` y `superadmin` pueden gestionar mapas de su contexto; `superadmin` tiene acceso global operativo.
- Para cambiar rol desde CLI:

```bash
npm run user:set-role -- --identifier=<email|username|uuid> --role=<viewer|creator|superadmin>
```

## Vercel (produccion)

En Vercel, `Project Settings > Environment Variables`, configura las mismas claves requeridas de `.env.example` para `Production` y `Preview`, especialmente:

- `DATABASE_URL`
- `AUTH_SESSION_SECRET` (o `SESSION_SECRET`)
- `YOUTUBE_API_KEY`
- `GOOGLE_GENAI_API_KEY` (o `GEMINI_API_KEY` / `GOOGLE_API_KEY`)
- `NOMINATIM_USER_AGENT`
- `NOMINATIM_EMAIL`
- `NEXT_PUBLIC_APP_URL`

Si quieres proteger el cron de cierre de votaciones:

- Define `MAP_POLLS_CRON_TOKEN`.
- El cron de `vercel.json` sigue funcionando por `user-agent` de Vercel Cron.
- Para ejecuciones manuales/externas, usa:
  `/api/map/polls/close-expired?token=<MAP_POLLS_CRON_TOKEN>`
  o header `x-cron-token` / `Authorization: Bearer`.

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

## APIs de votaciones (mapa)

- `POST /api/map/polls` crea/edita/publica/cierra (owner del canal)
- `POST /api/map/polls/:pollId/vote` voto irreversible con rate-limit anonimo
- `GET /api/map/polls/:pollId/results` resultados con payload segun audiencia
- `GET|POST /api/map/polls/close-expired` cierre batch de encuestas vencidas

## Siguiente fase recomendada

1. Aplicar `neon/migrations/0001_initial.sql` en todos los entornos Neon no inicializados.
2. Agregar polling de `runId` en frontend para progreso en tiempo real.
3. Endurecer tests de integración de sync incremental + manual verify.
4. Instrumentar métricas de costos (YouTube/Nominatim/Gemini) por corrida.

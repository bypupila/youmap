# Project Memory - TravelMap

Documento vivo de procesos para construir, validar, operar y evolucionar este proyecto.
Cada cambio relevante debe actualizar este archivo el mismo dia.

## Objetivo

- Centralizar el modo de trabajo tecnico y operativo.
- Reducir errores de contexto entre sesiones.
- Asegurar calidad en UX, SEO y mantenibilidad.

## Regla de actualizacion continua

- Actualizar este archivo en cada tarea que cambie comportamiento, arquitectura, flujo o infraestructura.
- Agregar una entrada en `Registro de memoria` con fecha y resumen del cambio.
- Si el cambio afecta un flujo, actualizar tambien su checklist en este archivo.
- No cerrar una tarea sin revisar si esta memoria quedo desactualizada.

## Stack y componentes clave

- Frontend: Next.js 16 + React 19 + TypeScript.
- UI: Tailwind + componentes en `src/components` y `src/components/design-system`.
- Mapa: `react-globe.gl` + `three` + base `MapExperience`.
- Backend app routes: `src/app/api/*`.
- Persistencia/Auth: Neon Postgres + sesión HTTP-only.
- Facturacion: Polar.
- Ingesta y geolocalizacion: YouTube API + Nominatim + Gemini solo en ambiguos o segunda pasada.
- Analitica y observabilidad: Microsoft Clarity, CSP endurecida y validacion de seguridad continua.

## Flujo de setup local

1. Instalar dependencias.
2. Configurar entorno (`.env.local`) desde `.env.example`.
3. Levantar app en desarrollo.
4. Aplicar migraciones y seed de Neon con `./scripts/bootstrap-local.sh`.
5. Validar rutas criticas.

Comandos base:

```bash
npm install
npm run dev
./scripts/bootstrap-local.sh
```

## Variables de entorno minimas

- `DATABASE_URL`
- `AUTH_SESSION_SECRET`
- `YOUTUBE_API_KEY`
- `GEMINI_API_KEY`
- `NOMINATIM_USER_AGENT`
- `NOMINATIM_EMAIL`

## Flujo funcional del producto

1. Landing: propuesta de valor + acceso a onboarding/auth/map.
2. Onboarding: captura de datos de creador y activacion.
3. Auth: ingreso por email o username.
4. Dashboard: estado de canal, sync y analitica base.
5. Map: experiencia interactiva global con header centrado, buscador real, acciones owner, rail derecho persistente, votacion publica y carrusel de video.
6. Explore/Pricing/Public profile (`/u/[username]`): descubrimiento y conversion.

## Marca y posicionamiento

- Marca principal: `TravelMap` / `YOUMAP - BY PUPILA`.
- Promesa central: convertir un canal de viajes en una experiencia geografica interactiva y publicable.
- Tono de marca: editorial, premium, tecnico y directo; evita UI generica o demasiado neutra.
- Identidad visual: superficies oscuras, acentos rojos, glass/blur controlado y foco fuerte en el contenido.
- Diferenciador funcional: el mapa no es solo un visor, es una capa de producto para comunidad, sponsors y votacion de audiencia.
- Superficies clave de marca:
  - home/landing con propuesta de valor
  - onboarding como activacion
  - mapa publico owner/public con acciones diferenciadas
  - votacion fan-driven como mecanismo de engagement
  - rail de sponsors como monetizacion nativa
- Lenguaje recomendado:
  - "tu mundo"
  - "panel admin"
  - "missing videos"
  - "vota el siguiente destino"
  - "mapa interactivo"
- Forma de crecimiento de marca:
  - creators de viaje como primer segmento
  - sponsors por pais/ruta
  - audiencia votando destinos
  - SEO publico por canal y por ruta

## Flujo de desarrollo por tarea

1. Definir alcance tecnico y criterio de aceptacion.
2. Reusar componentes/sistemas existentes antes de crear nuevos.
3. Implementar el cambio minimo correcto.
4. Validar responsive (mobile + desktop).
5. Validar contenido (copy, labels, estados vacios/errores).
6. Correr `npm run lint` y `npm run build`.
7. Hacer smoke test manual en navegador para rutas impactadas.
8. Actualizar esta memoria + documentacion relacionada.

## Checklist de QA por release

- Build y lint en verde.
- Sin errores de consola bloqueantes en rutas criticas.
- Navegacion y CTAs operativos.
- Estados de carga, error y vacio verificados.
- Interacciones de mapa estables (hover, click, filtro pais, salida de pais, refresh).
- SEO tecnico minimo:
- `title` y metadatos presentes en pantallas publicas.
- `favicon` disponible.
- Imagenes con atributos correctos (`alt`, `sizes` cuando aplica en `next/image`).
- Verificacion basica de performance visual (sin loops de render).

## Flujos de datos y scripts operativos

- Bootstrap DB local: `scripts/bootstrap-local.sh`.
- Bootstrap SQL Neon real: `scripts/bootstrap-neon.mjs`.
- Extraccion de videos de canal: `scripts/extract_youtube_channel_videos.py`.
- Generacion dataset de ubicaciones: `scripts/build_luisito_video_locations.py`.
- Datasets procesados: `data/processed/*`.

## Proceso operativo del skill `youtube-channel-geolocator`

Este es el proceso exacto que se debe seguir cada vez que se use este skill en este proyecto.

1. Confirmar contexto tecnico:
- repo objetivo correcto
- Python disponible
- variables minimas cargadas (`YOUTUBE_API_KEY`, `NOMINATIM_USER_AGENT`, `NOMINATIM_EMAIL`, `GEMINI_API_KEY` para ambiguos)

2. Definir entrada de canal:
- `channel_id`, o
- `handle`, o
- `uploads_playlist_id`
- si llega `handle`, resolver uploads playlist antes de extraer.

3. Ejecutar extraccion base (resumable):
- usar `video_id` como clave unica
- paginar playlist completa de uploads
- hidratar snippet + metrics + thumbnails + `recordingDetails` + `contentDetails.duration`
- excluir Shorts por defecto (`duration_seconds <= 60`)
- regla adicional: `#shorts` solo cuenta como Short si `duration_seconds <= 90`
- comando base de este repo:
```bash
python scripts/extract_youtube_channel_videos.py --handle @luisitocomunica
```

4. Generar o enriquecer ubicaciones:
- prioridad estricta de ubicacion:
1) `recordingDetails.location` de YouTube
2) heuristicas deterministicas (titulo/descripcion/entidades + normalizacion)
3) Gemini solo si hay ambiguedad o baja confianza
- no inventar ciudad cuando la evidencia es debil
- respetar rate limits de YouTube y Nominatim
- mantener trazabilidad: `location_source`, `location_evidence`, `location_confidence/location_score`.

5. Aplicar second-check de 2 capas (bajo consumo):
- capa 1 deterministica para todos los videos nuevos
- capa 2 Gemini solo para casos ambiguos o conflictivos
- clasificar salida:
- `verified_auto`
- `needs_manual` con razon
- `verified_manual` cuando operador confirma.

6. Gestionar cola manual:
- dejar consultable por canal (`location_status = needs_manual`)
- minima accion manual: `country_code + city + confirm`
- al confirmar: geocodificar con Nominatim y persistir `verification_source`.

7. Exportar datasets de mapa:
- JSON
- CSV
- GeoJSON con un `Feature` por video y coordenadas `[longitude, latitude]`
- validar que existan campos de contrato para frontend mapa:
- ids/video URL/thumbnail/title/published_at
- metricas (views/likes/comments)
- duracion + `is_short`
- pais/ciudad/region + lat/lng
- estado de verificacion (`location_status`, `verification_source`, `location_score`, `needs_manual_reason`).

8. Validar calidad antes de cerrar:
- rerun sin duplicados por `video_id`
- casos ambiguos no deben producir precision falsa de ciudad
- exportes validos y completos
- smoke test visual de mapa en local (`/map` y leyenda por pais).

9. Cerrar tarea:
- actualizar documentacion afectada
- registrar cambios en `Registro de memoria` de este archivo.

## Rutas y APIs clave

- UI: `/`, `/auth`, `/onboarding`, `/dashboard`, `/map`, `/explore`, `/pricing`, `/u/[username]`.
- API:
- `GET /api/map/data?channelId=<id>`
- `POST /api/map/sync`
- `GET /api/map/sync/:runId`
- `GET /api/map/manual-verify?channelId=<id>`
- `POST /api/map/manual-verify`

## Riesgos operativos conocidos (actual)

- Riesgo de loops de render en landing/onboarding cuando `MapExperience` se monta en condiciones no controladas.
- Dependencia fuerte de `DATABASE_URL` y `AUTH_SESSION_SECRET` para `/dashboard`, auth y middleware.
- Deuda de consistencia visual entre superficies opacas y glass en distintas pantallas.
- Faltan tests de integración que cubran el flujo Neon completo: login, onboarding, sync de mapa y billing.

## Protocolo de incidentes

1. Reproducir en local con ruta y pasos exactos.
2. Capturar error de consola y/o server log.
3. Corregir causa raiz, no solo sintoma visual.
4. Validar regresion en rutas conectadas.
5. Registrar incidente y solucion en `Registro de memoria`.

## Registro de memoria

### 2026-04-21

- Se actualiza el stack real a Next.js 16 + React 19.
- Se consolida la experiencia del mapa con header centrado, buscador funcional, acciones owner y share link canonico.
- Se implementa votacion fan-driven con popup obligatorio, shortlist por pais/ciudad y resultados persistentes.
- Se agrega carrusel de video con navegacion por pais, flechas laterales, estados visto/nuevo y CTA `Ver video`.
- Se reemplaza el panel manual por un modal de `Missing videos` con bulk edit por pais y ciudad.
- Se refuerza la seguridad del frontend con Clarity permitida en CSP y validaciones de rutas legacy de mapa.
- Se documenta la capa de marca: posicionamiento, tono, superficies clave y lenguaje recomendado para el producto.

### 2026-04-16

- Se crea `PROJECT_MEMORY.md` como fuente unica de procesos operativos.
- Se define regla de actualizacion continua obligatoria en cada tarea.
- Se incorporan checklist de desarrollo, QA, release e incidentes.
- Se actualiza `public/creators/luisito-comunica.png` con avatar real del canal de YouTube en resolucion 800x800 y formato PNG.
- Se documenta el proceso operativo completo del skill `youtube-channel-geolocator` con pasos, reglas duras y comandos de este repo.
- Se cierra la alineacion documental de la migracion a Neon: bootstrap oficial, contrato de entorno y riesgos actuales.

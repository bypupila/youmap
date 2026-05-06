# Design.MD - TravelYourMap

Fecha: 2026-05-06

Este documento fija el contrato de diseno, marca y compliance visual para TravelYourMap. No reemplaza asesoria legal; convierte los riesgos detectados en reglas practicas de producto e implementacion.

## Objetivo

TravelYourMap debe sentirse como una herramienta propia para creadores de viaje: mapa, rutas, comunidad, sponsors y analitica. Puede integrarse con YouTube, pero no debe parecer un producto oficial, afiliado o derivado visualmente de YouTube.

## Marca

- Nombre canonico: `TravelYourMap`.
- Firma de producto: `TravelYourMap - BY PUPILA`.
- Categoria: mapas interactivos para creadores de viaje.
- Promesa: convertir un canal de viajes en una experiencia geografica publicable.
- Tono: editorial, premium, tecnico y directo.

No usar como marca propia:

- `YOUMAP`
- `YouMap`
- `TravelMap`
- `MapTuber`
- cualquier nombre que sugiera afiliacion con YouTube o Google

## Uso permitido de YouTube

Se puede usar `YouTube` solo de forma referencial o descriptiva:

- `Conectado a YouTube`
- `Abrir en YouTube`
- `compatible con YouTube`
- `usa YouTube API Services`
- links a terminos, privacidad o player oficial

Siempre que se hable de integracion, debe quedar claro que YouTube es un tercero.

Disclaimer obligatorio en superficies legales y de alta confianza:

> TravelYourMap no esta afiliado, patrocinado ni respaldado por YouTube ni por Google.

## Uso prohibido o de alto riesgo

No usar:

- logo de YouTube como icono de navegacion, badge de marca, favicon, sidebar item o CTA propio
- claims como `UI nativa de YouTube`, `tipo YouTube Studio`, `inspirado en YouTube`
- botones rojos con logo de YouTube dentro de la UI propia
- paleta rojo puro + negro como identidad dominante
- lenguaje que sugiera producto oficial, partnership o respaldo

El logo de YouTube solo puede aparecer si lo renderiza el reproductor oficial embebido o una superficie externa controlada por YouTube.

## Identidad visual

La app mantiene una base dark premium, pero el acento debe ser coral/naranja-rojo propio, no rojo YouTube puro.

Tokens recomendados:

- `--travel-accent: #ff5a3d`
- `--travel-accent-strong: #d8462f`
- `--travel-accent-soft: rgba(255, 90, 61, 0.16)`

Evitar:

- `#ff0000`
- `#cc0000`
- `rgba(255, 0, 0, ...)`
- `bg-red-500`, `text-red-*`, `border-red-*` para acciones principales de marca

Permitido:

- coral para CTA primarios
- superficies dark con glass/blur controlado
- iconos genericos de video, mapa, canal, ruta, globo o enlace externo

## Iconografia

Usar iconos genericos para la integracion:

- `Video`
- `MapPin`
- `Globe`
- `ArrowSquareOut`
- `LinkSimple`

No usar `YoutubeLogo` en sidebar, header, menu mobile, botones primarios, favicon ni badges internos.

Texto recomendado para el estado de canal:

- `Conectado a YouTube`
- `Abrir en YouTube`
- `Reproductor oficial de YouTube`

## Layout y diferenciacion

Aunque el producto use sidebar, content y rail derecho, la composicion debe comunicar mapa/viaje, no estudio de video.

Reglas:

- El mapa/globo debe ser la senal visual principal.
- La navegacion debe priorizar `Mapa`, `Videos`, `Votaciones`, `Sponsors`, `Panel admin`.
- La marca visible debe ser `TravelYourMap`, no el canal ni YouTube como marca de shell.
- El canal conectado puede mostrarse como entidad de datos, no como identidad del producto.
- Los CTA externos deben usar icono de salida, no logo de plataforma.

## Copy

Usar:

- `mapa interactivo`
- `rutas`
- `destinos`
- `creadores de viaje`
- `canal conectado`
- `sponsors por destino`
- `votacion de audiencia`

Evitar:

- `YouTube Studio`
- `UI nativa de YouTube`
- `inspirado en YouTube`
- `for YouTube Creators` como marca principal
- cualquier copy que convierta a YouTube en parte de la identidad del producto

## Componentes y archivos clave

- Sistema visual: `docs/design-system.md`
- Tokens globales: `src/app/globals.css`
- Shell principal del mapa: `src/components/map/map-experience.tsx`
- Player embebido: `src/components/map/youtube-embed-player.tsx`
- Metadata global: `src/app/layout.tsx`
- Legal: `src/app/terms/page.tsx` y `src/app/privacy/page.tsx`

## Compatibilidad de rename

El producto debe usar `travelyourmap_*` para nuevos datos locales, pero leer temporalmente claves legacy:

- `travelmap_session`
- `travelmap_voter`
- `travelmap_seen_videos_v1`
- `travelmap_opened_videos_v1`
- `travelmap_saved_videos_v1`
- `travelmap_featured_videos_v1`
- `travelmap-import-run-id:*`

La migracion no debe cortar sesiones, votos, actividad local ni runs de onboarding existentes.

## QA visual y de contenido

Antes de publicar cambios de marca o UI, ejecutar:

```bash
rg "YOUMAP|YouMap|TravelMap|MapTuber|YouTube Studio|inspirada en YouTube|for YouTube Creators" src docs README.md Design.MD
rg "YoutubeLogo" src
rg "#ff0000|#cc0000|rgba\\(255,\\s*0,\\s*0|bg-red-500|text-red-|border-red-" src docs Design.MD
npm run lint
npm run build
```

Validar en navegador:

- landing
- onboarding
- auth
- dashboard/map
- `/map`
- `/explore`
- `/u/[username]`
- terms/privacy

Viewports minimos:

- 320px
- 390px
- 768px
- 1024px
- 1440px

Criterios de aceptacion:

- No hay logo de YouTube fuera del player oficial.
- El nombre visible del producto es `TravelYourMap`.
- Los CTA a YouTube son referenciales y usan icono generico de salida.
- No hay claims de afiliacion, respaldo o UI oficial.
- No hay textos cortados ni overlap en mobile.
- La experiencia se siente centrada en mapa/viaje, no en una copia de YouTube Studio.

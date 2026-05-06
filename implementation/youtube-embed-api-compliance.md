# Contrato de Implementacion: YouTube Embed Oficial

Fecha: 2026-05-05

## Objetivo

Permitir que los videos se reproduzcan dentro de TravelYourMap usando el reproductor oficial de YouTube, conservando la experiencia nativa del mapa y minimizando riesgo de terminos, monetizacion, privacidad, quota y copyright.

## No objetivos

- No descargar videos.
- No rehostear videos.
- No ocultar, modificar, cubrir ni reemplazar controles, links, branding o ads de YouTube.
- No crear un player propio ni separar audio/video.
- No prometer conteo garantizado de views o revenue.

## Decisiones

1. El video se reproduce con iframe oficial `youtube.com/embed`.
2. El mapa, rutas, paises, votaciones, sponsors y analitica propia siguen siendo TravelYourMap.
3. No autoplay por defecto.
4. No sponsor overlay sobre el player.
5. YouTube API Data no autorizada se refresca o elimina cada 30 dias.
6. Analytics avanzadas basadas en views/likes requieren OAuth del creador o revision legal/compliance antes de venta fuerte.
7. Scraping HTML publico no se usa en produccion como fallback normal.

## Contrato tecnico

### Player

- Crear un componente `YouTubeEmbedPlayer` reutilizable.
- `src`: `https://www.youtube.com/embed/{videoId}?playsinline=1&origin={origin}`.
- No incluir `autoplay=1` por defecto.
- Iframe con `title`, `loading="lazy"`, `allowFullScreen`.
- `allow`: `accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share`.
- Mantener viewport >= 200x200; preferible 16:9 >= 480x270 en desktop.
- Si se usa IFrame API (`enablejsapi=1`), incluir `origin` siempre.
- Fallback visible: "Ver en YouTube" cuando embed este deshabilitado, age-restricted o falle.

### CSP y Referer

- Actualizar `script-src` a incluir `https://www.youtube.com`, requerido por `https://www.youtube.com/iframe_api`.
- Actualizar `frame-src` a incluir `https://www.youtube.com` y, si se decide privacy enhanced mode, `https://www.youtube-nocookie.com`.
- Mantener `Referrer-Policy: strict-origin-when-cross-origin`.
- No abrir embeds en `window.open(..., "noreferrer")`; YouTube requiere Referer para embedded playback.

### UX

- Reusar `VideoSelectionSheet` mobile y `DesktopVideoMapCard` desktop.
- Al seleccionar un pin, mostrar el player oficial en el panel, no solo thumbnail.
- Los controles de siguiente/anterior pueden estar fuera del player, pero no encima de controles/ads/branding de YouTube.
- Estado local `visto/abierto/guardado/destacado` debe ser copy propio de TravelYourMap, no sinonimo de view oficial de YouTube.

### Sponsors

- Sponsors se muestran como cards/rail de TravelYourMap por pais/ruta/destino.
- No colocar sponsor dentro, encima, pegado o bloqueando el player.
- No vender inventario como "ad de YouTube" ni "pre-roll de TravelYourMap".
- La pagina debe conservar valor independiente aunque se quitara el embed: mapa, geografia, votaciones, rutas, perfil, leads.

### API Data

- Agregar trazabilidad de frescura:
  - `youtube_data_refreshed_at`
  - `youtube_data_expires_at`
  - opcional `youtube_data_authorized`
- Minimizar `source_payload`: guardar solo lo necesario para depurar, no payloads completos indefinidos.
- Para Non-Authorized Data, refrescar o borrar en <= 30 dias.
- Mostrar timestamps tipo "Datos de YouTube actualizados el ...".
- Separar metricas:
  - YouTube raw data: views/likes/comments frescos desde API.
  - TravelYourMap native metrics: opens, saves, sponsor clicks, votes, leads.
- Evitar scores comerciales que mezclen views/likes de YouTube sin consentimiento/auditoria.

### OAuth futuro

- Si se vende analytics de YouTube por destino:
  - OAuth read-only contextual.
  - Privacy Policy con YouTube API Services y Google Privacy Policy.
  - Revocacion de token.
  - Borrado de Authorized Data en <= 7 dias tras revocacion directa.
  - Reconfirmacion cada 30 dias.
  - Compliance audit/cuota si escala o se solicitan metricas derivadas.

### Made for Kids

- Llamar `videos.list` con `part=id,status` o extender batch actual con `status`.
- Persistir `made_for_kids`.
- Si `made_for_kids=true`, apagar tracking propio del player/video y revisar compliance COPPA/GDPR.

### Terms y Privacy

- Crear `/terms` y `/privacy`.
- Linkear YouTube Terms: https://www.youtube.com/t/terms.
- Linkear Google Privacy Policy: https://www.google.com/policies/privacy.
- Explicar que TravelYourMap usa YouTube API Services y embedded player.
- Explicar datos que guarda: canal, video ID, titulo, descripcion, thumbnail, fechas, estadisticas, estado de ubicacion, actividad propia.
- Explicar borrado y revocacion cuando haya OAuth.
- Agregar aceptacion en onboarding/auth antes de importar.

## Acceptance criteria

- Un video se reproduce dentro de `VideoSelectionSheet` y `DesktopVideoMapCard` con iframe oficial.
- No hay autoplay al cargar el mapa/panel.
- CSP no bloquea `youtube.com/embed`.
- Requests de iframe envian Referer de la pagina.
- Los sponsors no cubren ni rodean el player de forma vendible como ad de video.
- No se usa scraping HTML en produccion para resolver/importar canales.
- Los datos de YouTube tienen fecha de refresh y politica de expiracion <= 30 dias si no hay OAuth.
- Existe Terms/Privacy visible.
- Existe manejo `made_for_kids`.
- Lint/build pasan despues de implementar.
- QA responsive valida mobile y desktop, sin overflow ni controles tapados.

## Validacion ejecutada

- `npm run lint` OK.
- `npm run build` OK.
- Se genero la ruta `POST/GET /api/youtube/data-expiry/sweep` y se conecto cron diario en `vercel.json`.

## Addendum 2026-05-06

Cambios de hardening aplicados:

- `YouTubeEmbedPlayer` usa helpers compartidos para config oficial, valida `youtube_video_id`, mantiene `origin`, no activa autoplay y elimina `modestbranding`.
- El viewport del player queda con minimo de 200px reales para cumplir el tamano minimo del reproductor embebido.
- El iframe oficial permanece visible durante carga; no se tapa esperando `onReady`. El fallback con thumbnail solo aparece si la API o el ID fallan.
- CSP cubre `script-src https://www.youtube.com` para el IFrame API y `frame-src` para hosts oficiales de embed.
- `getYouTubeHref` ignora URLs arbitrarias y reconstruye el watch canonico desde un ID validado; `getOfficialYouTubeEmbedUrl` y `getOfficialYouTubeEmbedPlayerVars` quedan como contrato compartido.
- `TravelGlobe` elimina links directos a videos en tooltips/paneles internos; las superficies reproducibles deben abrir `VideoSelectionSheet` o `DesktopVideoMapCard`.
- `scripts/extract_youtube_channel_videos.py` hidrata `status`, exporta `made_for_kids`, `youtube_data_refreshed_at` y `youtube_data_expires_at`, y evita `search.list` salvo `--allow-search-fallback`.
- `src/lib/local-map-loader.ts` acepta campos de compliance cuando los datasets estaticos se regeneren.
- `scripts/audit-youtube-embeds.mjs` valida datasets, codigo del player, CSP, bloqueo de scraping en produccion y opcionalmente Neon `by.pupila` con `--check-neon-by-pupila`.

Validacion esperada para cierre:

- `npm run youtube:embed-audit`
- `python3 -m py_compile scripts/extract_youtube_channel_videos.py`
- `npm run lint`
- `npm run build`
- QA browser en rutas demo/locales con embed visible.

Validacion browser ejecutada el 2026-05-06:

- `/map?channelId=demo-channel` en desktop, tablet y mobile.
- `/map?channelId=luisito-global-map`.
- `/map?channelId=drew-global-map`.
- `/u/demo`.
- `/u/by.pupila`.
- Resultado: todos cargaron `https://www.youtube.com/embed/...` con `enablejsapi=1`, `origin`, sin `autoplay=1`, sin `modestbranding`, sin errores CSP y sin overlays sobre controles inferiores.

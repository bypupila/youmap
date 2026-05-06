# YouTube Embed y API Compliance Discovery

Fecha: 2026-05-05

## Objetivo

Definir la forma mas segura de que TravelYourMap reproduzca videos dentro de la plataforma usando el embed oficial de YouTube, sin descargar ni rehostear contenido, y sin chocar con los terminos de YouTube API Services, YouTube Terms, monetizacion, privacidad o reglas de anuncios.

Esto no es asesoramiento legal. Es una lectura tecnica de fuentes oficiales y del estado actual del repo para reducir riesgo antes de implementar.

## Fuentes oficiales consultadas

- YouTube API Services Terms of Service: https://developers.google.com/youtube/terms/api-services-terms-of-service
- YouTube API Services Developer Policies: https://developers.google.com/youtube/terms/developer-policies
- Required Minimum Functionality para embedded players: https://developers.google.com/youtube/terms/required-minimum-functionality
- YouTube IFrame Player API: https://developers.google.com/youtube/iframe_api_reference
- YouTube embedded player parameters: https://developers.google.com/youtube/player_parameters
- YouTube Help, embeds: https://support.google.com/youtube/answer/171780
- YouTube Help, ads on embedded videos: https://support.google.com/youtube/answer/132596
- YouTube Terms: https://www.youtube.com/t/terms
- Made for Kids status guide: https://developers.google.com/youtube/v3/guides/made_for_kids_status
- YouTube Data API quota and compliance audits: https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits

## Estado actual del repo

CONFIRMADO:

- La UI principal no reproduce el video dentro del mapa. `src/components/map/video-selection-sheet.tsx` y `src/components/map/desktop-video-map-card.tsx` muestran thumbnail y abren `youtube.com/watch?v=...` en una nueva pestana.
- `src/components/map/video-viewer-utils.ts` construye URLs watch de YouTube, no embed.
- `next.config.mjs` tiene `frame-src 'self'`, por lo que un iframe de YouTube quedaria bloqueado por CSP hasta abrir `https://www.youtube.com` o `https://www.youtube-nocookie.com`.
- `next.config.mjs` ya usa `Referrer-Policy: strict-origin-when-cross-origin`, que coincide con la recomendacion oficial para identificar embeds.
- `src/lib/youtube.ts` usa YouTube Data API para `channels.list`, `playlistItems.list`, `videos.list`, `playlists.list` y `search.list`.
- `src/lib/youtube-public.ts` usa HTML publico de canal, `/about` y RSS `feeds/videos.xml` para validar canal sin API key.
- `public.videos` guarda `title`, `description`, `thumbnail_url`, `view_count`, `like_count`, `comment_count`, `duration_seconds` y `source_payload`.
- No encontre rutas/links claros de `Terms` o `Privacy Policy` que cumplan con los requisitos especificos de YouTube API Client.

## Hallazgos

### 1. Embed oficial es la ruta correcta para reproduccion in-platform

CONFIRMADO. YouTube permite mostrar videos mediante el YouTube embeddable player. La implementacion debe usar `https://www.youtube.com/embed/VIDEO_ID` o la IFrame Player API, no descargar, cachear ni separar audio/video.

Decision recomendada: integrar iframe oficial dentro del panel de video existente. El mapa sigue siendo nativo de TravelYourMap; el video sigue siendo YouTube.

### 2. No conviene usar autoplay ni scripted playback

CONFIRMADO. YouTube Help indica que los videos embebidos con autoplay no incrementan views. Para ads en embeds, YouTube recomienda/require un player suficientemente grande y standard click-to-play, no scripted play.

Decision recomendada: abrir el overlay/card con el iframe oficial visible y `autoplay=0`. El usuario debe iniciar el video con el play del reproductor de YouTube.

### 3. Las views y ads pueden contar, pero no se deben prometer

CONFIRMADO. Los embeds pueden mostrar ads y generar revenue para el video owner. YouTube tambien aclara que solo YouTube y el dueno del video participan en ese revenue, no el sitio embedder. El conteo de views depende de sistemas de YouTube, del tipo de playback, restricciones, fraude, privacidad, ads, edad y autoplay.

Decision recomendada: copy publico honesto: "El video se reproduce con el reproductor oficial de YouTube. Las vistas, anuncios y revenue se rigen por YouTube." Evitar prometer "cada reproduccion cuenta como vista".

### 4. Sponsors propios son posibles, pero no pegados al player

CONFIRMADO. YouTube Terms y Developer Policies restringen vender ads/sponsors colocados en, dentro o alrededor del contenido/player de YouTube, y tambien paginas donde el contenido de YouTube sea la base principal de la venta. A la vez, permiten API clients con ads si existe suficiente valor independiente.

Decision recomendada: vender sponsors como capa de TravelYourMap: pais, ruta, destino, comunidad, votaciones, perfil publico, clicks y leads. No vender "pre-roll propio", "overlay sponsor sobre el video", ni "banner alrededor del player de YouTube". Mantener sponsors visualmente separados del reproductor.

### 5. El mayor riesgo actual esta en almacenamiento y analitica de API Data

CONFIRMADO. Sin OAuth del propietario del canal, los datos son Non-Authorized Data. La politica permite almacenarlos temporalmente, pero no mas de 30 dias sin refrescar o borrar. Estadisticas como views/subscribers obtenidas sin autorizacion no deben almacenarse mas de 30 dias.

Impacto en el repo:

- `view_count`, `like_count`, `comment_count`, `subscriber_count` y `source_payload.video_details` necesitan `refreshed_at`/expiracion o borrado/refresh <= 30 dias.
- KPIs agregados como views por pais, totalViews o rankings por views son mas sensibles que mostrar un raw view count fresco. YouTube tambien restringe crear datos/metricas derivadas desde API Data salvo permisos/auditoria aplicable.

Decision recomendada:

- MVP compliance sin OAuth: usar YouTube API para IDs, metadata basica y playability/MFK; refrescar o borrar API Data cada 30 dias; no vender ni basar pricing en estadisticas derivadas de YouTube.
- Version robusta para analytics: agregar OAuth read-only por creador, politica de privacidad/consentimiento, revocacion, borrado en 7 dias y reconfirmacion cada 30 dias. Para uso de analitica derivada o escala, preparar Compliance Audit/cuota.

### 6. El fallback sin API key es tecnicamente util, pero compliance-risky en produccion

CONFIRMADO. `src/lib/youtube-public.ts` scrapea HTML publico del canal y `/about`. Developer Policies prohiben scraping de YouTube Applications y usar tecnologia distinta a YouTube API Services para acceder/recuperar API Data.

Decision recomendada: no usar scraping HTML como ruta de produccion si el objetivo es "sin chocar terminos". Convertirlo en herramienta local/dev o removerlo de produccion. Para validacion y import real, usar Data API oficial.

### 7. Falta contrato legal visible

CONFIRMADO. Developer Policies requieren que el API Client muestre link a YouTube Terms, diga que el usuario acepta esos terminos al usar el API Client y tenga Privacy Policy que explique uso de YouTube API Services, Google Privacy Policy, datos accedidos, almacenamiento, borrado y revocacion si usa Authorized Data.

Decision recomendada: crear `/terms` y `/privacy`, enlazarlas en footer/onboarding/auth, y agregar aceptacion explicita al alta.

### 8. Falta Made for Kids handling

CONFIRMADO. Para embeds, YouTube exige mirar `status.madeForKids` con `videos.list(part=id,status)` y apagar tracking/compliance especial si el video es MFK.

Decision recomendada: extender `loadVideoDetails` con `status.madeForKids`, persistir `made_for_kids`, y si es true no ejecutar tracking propio sobre ese player/video.

### 9. Cuota actual puede escalar, pero hay puntos caros

CONFIRMADO. Data API default quota es 10,000 units/day. `channels.list`, `playlistItems.list`, `videos.list` y `playlists.list` cuestan 1 unit por request; `search.list` cuesta 100 units.

Decision recomendada:

- Evitar `search.list` como fallback normal. Priorizar channel ID, handle y uploads playlist.
- Batches de `videos.list` por 50 IDs.
- Refresh incremental y cache con expiracion <= 30 dias.
- Preparar compliance audit antes de escala alta o analytics derivada.

## Recomendacion final

La mejor opcion para TravelYourMap es un modelo hibrido:

1. Reproduccion dentro de TravelYourMap con iframe oficial de YouTube, click-to-play, sin autoplay, sin overlays encima del player y con fallback "Ver en YouTube".
2. Importacion via YouTube Data API oficial, no scraping HTML en produccion.
3. Data governance: refrescar/borrar API Data cada 30 dias si no hay OAuth; si quieres analytics fuertes por destino con views/likes, agregar OAuth read-only del creador y preparar compliance audit.
4. Sponsors monetizados como valor propio de TravelYourMap, no como publicidad pegada al player.
5. Terms/Privacy visibles antes de escalar.

## Pregunta de producto pendiente

HIGH: quieres un MVP mas rapido sin OAuth, limitado a metadata fresca y metricas propias de TravelYourMap, o quieres ir directo al modelo robusto con OAuth creator para habilitar analytics de YouTube por destino con menor riesgo?

Recomendacion: empezar con embed oficial + Data API oficial + refresh/borrado 30 dias + metricas propias de TravelYourMap. Agregar OAuth antes de vender analytics avanzadas basadas en views/likes.

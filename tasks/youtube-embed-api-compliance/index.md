# Tasks: YouTube Embed y API Compliance

Estado de ejecucion (2026-05-05):

- [x] P0.1 `YouTubeEmbedPlayer` + reemplazo de thumbnails por embed en `VideoSelectionSheet` y `DesktopVideoMapCard`.
- [x] P0.2 CSP `script-src` para YouTube IFrame API y `frame-src` abierto para YouTube embed.
- [x] P0.3 Ruta productiva de validacion/import sobre YouTube Data API oficial.
- [x] P0.4 `/terms` y `/privacy` visibles en auth/onboarding con aceptacion requerida.
- [x] P0.5 Campos de frescura/expiracion + sweep de invalidacion + cron diario.
- [x] P0.6 `made_for_kids` persistido y tracking local desactivado para ese caso.
- [x] P1.7 Separacion operacional en UI (estado de frescura YouTube en mapa).
- [x] P1.9 Reduccion de riesgo de cuota (`search.list` queda excepcional).
- [x] P1.10 Helpers canonicos para `youtube_video_id`, `watch` y embed oficial.
- [x] P1.11 `TravelGlobe` sin links directos a videos desde preview interno.
- [x] P1.12 Auditoria automatica `npm run youtube:embed-audit`.
- [x] P1.13 Extractor local endurecido con `status.madeForKids` y expiracion de datos.
- [ ] P2.14 OAuth read-only para creadores.
- [ ] P2.15 Paquete de compliance audit/cuota extendida.

## P0 - Antes de publicar embeds

1. Crear `YouTubeEmbedPlayer`.
   - Archivos probables: `src/components/map/youtube-embed-player.tsx`, `src/components/map/video-selection-sheet.tsx`, `src/components/map/desktop-video-map-card.tsx`.
   - Validacion: iframe visible, click-to-play, no autoplay, fallback a YouTube.

2. Abrir CSP para YouTube embeds.
   - Archivo: `next.config.mjs`.
   - Cambio: `script-src` incluye `https://www.youtube.com`; `frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com`.
   - Validacion: no errores CSP en consola y `https://www.youtube.com/iframe_api` carga.

3. Eliminar scraping HTML como fallback de produccion.
   - Archivos: `src/lib/youtube-public.ts`, `src/lib/youtube.ts`, `src/app/api/youtube/validate/route.ts`.
   - Cambio: Data API oficial como contrato productivo; fallback publico solo dev/demo o removido.
   - Validacion: import funciona con `YOUTUBE_API_KEY`; si falta key, error honesto.

4. Agregar Terms y Privacy.
   - Archivos probables: `src/app/terms/page.tsx`, `src/app/privacy/page.tsx`, onboarding/auth footer.
   - Validacion: links visibles, copy menciona YouTube API Services, YouTube Terms y Google Privacy Policy.

5. Agregar freshness/expiracion de YouTube API Data.
   - Archivos probables: migration Neon, `src/lib/youtube-import.ts`, `src/lib/map-sync.ts`, `src/lib/map-data.ts`.
   - Validacion: todo video importado tiene `youtube_data_refreshed_at`; job refresca o invalida <= 30 dias.

6. Agregar `made_for_kids`.
   - Archivos probables: migration Neon, `src/lib/youtube.ts`, import/sync.
   - Validacion: `videos.list(part=id,status)` persiste MFK y apaga tracking propio.

## P1 - Reducir riesgo comercial

7. Separar metricas YouTube vs metricas TravelYourMap.
   - Cambio: UI y analytics no mezclan views/likes de YouTube con scores propios sin disclosure.
   - Validacion: labels claros y timestamp de datos YouTube.

8. Revisar sponsors en superficies con embed.
   - Cambio: sponsors por destino/ruta, separados del player.
   - Validacion: no overlay, no bloqueo de controles, no copy de "ad de video".

9. Reducir uso de `search.list`.
   - Cambio: resolver por channel ID/handle primero; `search.list` solo fallback excepcional.
   - Validacion: logs de cuota muestran menor consumo.

10. Centralizar helpers de embed oficial.
   - Archivos: `src/components/map/video-viewer-utils.ts`, `src/components/map/youtube-embed-player.tsx`.
   - Validacion: player usa `getOfficialYouTubeEmbedPlayerVars`, sin `modestbranding`, sin autoplay, iframe visible >= 200x200 y sin overlay sobre controles.

11. Eliminar links directos desde previews reproducibles del globo.
   - Archivo: `src/components/travel-globe.tsx`.
   - Validacion: no existe `href={getYouTubeHref(video)}` ni anchor HTML en tooltip de video.

12. Agregar auditoria de contrato YouTube.
   - Archivo: `scripts/audit-youtube-embeds.mjs`.
   - Validacion: `npm run youtube:embed-audit` pasa y reporta solo warnings esperados de datasets estaticos antiguos.

13. Endurecer extractor local de canales.
   - Archivo: `scripts/extract_youtube_channel_videos.py`.
   - Validacion: `python3 -m py_compile scripts/extract_youtube_channel_videos.py`; al ejecutar con API key exporta `made_for_kids`, frescura y expiracion.

## P2 - Modelo robusto de analytics

14. OAuth read-only de YouTube para creadores.
    - Requiere Terms/Privacy finales, revocacion, borrado y token management.
    - Validacion: usuario autoriza canal, puede revocar, datos se borran dentro de ventanas requeridas.

15. Preparar compliance audit/cuota.
    - Requiere inventario de endpoints, pantallas, datos guardados, deletion policy, privacy docs y demo de produccion.
    - Validacion: paquete de auditoria listo antes de pedir cuota mayor o vender analytics avanzadas.

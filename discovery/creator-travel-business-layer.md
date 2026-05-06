# Discovery: Creator Travel Business Layer

Fecha: 2026-05-06

## Tema activo

Convertir TravelYourMap en una herramienta escalable para creadores de viajes en YouTube: mapa publico, media kit, sponsor hub, fan vote, analytics propios y capa comercial independiente del player de YouTube.

## Fuentes oficiales verificadas

- YouTube API Services Required Minimum Functionality: https://developers.google.com/youtube/terms/required-minimum-functionality
- YouTube API Services Developer Policies: https://developers.google.com/youtube/terms/developer-policies
- Ads on embedded videos - YouTube Help: https://support.google.com/youtube/answer/132596

## Estado actual confirmado por codigo

- `src/components/map/video-selection-sheet.tsx` y `src/components/map/desktop-video-map-card.tsx` ya estan encaminados al modelo embed oficial con `YouTubeEmbedPlayer`.
- `next.config.mjs` ya abre `frame-src` para YouTube embed y mantiene una CSP compatible con el player.
- `/u/[username]` existe como mapa publico con metadata dinamica y sitemap para perfiles publicos.
- `src/lib/map-public.ts` carga sponsors, fan vote y payload publico diferenciado por viewer/owner.
- `public.sponsors`, `public.sponsor_geo_rules`, `public.sponsor_clicks` y `public.sponsor_inquiries` ya existen como base comercial.
- `BrandInquiryCta` permite que una marca envie una propuesta desde el mapa publico.
- `FanVoteCard` ya permite votaciones por pais/ciudad, popup, cierre y resultados segun audiencia.
- La actividad de video (`seen`, `opened`, `saved`, `featured`) existe, pero vive en `localStorage`; no es todavia un producto de analytics server-side ni un argumento fuerte para sponsors.
- `AnalyticsDashboard` y `/api/analytics/[channelId]` existen, pero el dashboard principal actual usa `MapExperience`; la analitica comercial no esta centralizada como cockpit del creador.
- Las metricas actuales mezclan mucho YouTube API Data (`view_count`, `total_views`) con estimaciones propias (`monthly_visitors`) sin una separacion fuerte para venta comercial.
- `SponsorManagerDialog` permite crear sponsors, pero no hay inbox/CRM de propuestas, estados comerciales, notas, export, notificaciones, ni pipeline de cierre.
- `POST /api/sponsors/click` recibe `channelId`, pero actualmente no persiste `channel_id`; eso limita atribucion por canal en reporting.
- No existe una ruta dedicada tipo media kit exportable para marcas (`/u/[username]/media-kit` o equivalente).
- No existe un modelo de paquetes comerciales por destino, pais, ruta o temporada.
- No existe tracking server-side de impresiones del mapa, impresiones de sponsor, aperturas de embed, clicks por destino o conversiones de inquiry.
- Terms/Privacy ya existen como base, pero la promesa comercial publica aun debe evitar prometer que cada reproduccion cuenta como view o que TravelYourMap participa en ad revenue de YouTube.

## Constraints oficiales relevantes

- El player embebido debe conservar identidad, Referer, tamano minimo, branding, controles y no debe tener overlays sobre el iframe.
- Los embeds pueden mostrar ads y el creador puede recibir revenue por ads del player, pero el sitio embedder no participa de ese revenue.
- TravelYourMap debe aportar valor independiente: mapa, discovery por destino, comunidad, leads, sponsors, media kit y analytics propios. No conviene posicionarlo como una replica o agregador de YouTube.
- Las metricas de YouTube API deben tratarse como datos de YouTube, con frescura/expiracion y copy claro. Las metricas vendibles de TravelYourMap deben ser first-party.

## Preguntas de investigacion

### High

1. Cual es el wedge comercial principal de v1?
   - Impacto: define dashboard, pricing, copy, onboarding y datos.
   - Dependencia: sponsor hub, media kit, analytics, SEO.
   - Recommended answer: "Media kit interactivo + sponsor leads por destino" como primera promesa pagable.
   - Status: open.

2. Cual sera la metrica vendible principal?
   - Impacto: define que eventos server-side se deben instrumentar.
   - Dependencia: sponsor reporting, planes, dashboard.
   - Recommended answer: usar metricas propias: visitas al mapa, clicks de sponsor, inquiries, votos, destinos guardados/abiertos; dejar YouTube views como contexto fresco, no KPI de venta.
   - Status: inferred.

3. Como se monetiza sin chocar con YouTube?
   - Impacto: define sponsor placement y copy legal.
   - Dependencia: UI de sponsors, media kit, terms.
   - Recommended answer: vender inventario TravelYourMap por pais/destino/ruta/perfil, nunca ads sobre o alrededor del player de YouTube.
   - Status: inferred.

4. Que necesita ver una marca para contactar a un creador?
   - Impacto: define media kit y brand-facing UX.
   - Dependencia: sponsor inquiry, public profile, analytics propios.
   - Recommended answer: destinos cubiertos, tipo de audiencia via mapas/votos, formatos de sponsor disponibles, CTA directo, ejemplos activos y datos frescos.
   - Status: inferred.

5. Donde vive el cockpit comercial del creador?
   - Impacto: define si `/dashboard` sigue siendo mapa admin o suma una vista negocio.
   - Dependencia: inquiry CRM, stats, plan gating.
   - Recommended answer: mantener mapa como producto principal, pero agregar un panel "Negocio" dentro del dashboard/rail owner con leads, sponsor stats y media kit.
   - Status: open.

### Medium

6. Debe existir una ruta publica de media kit?
   - Impacto: mejora conversion B2B y shareability.
   - Recommended answer: si, `/u/[username]/media-kit` o seccion imprimible/linkable desde `/u/[username]`.
   - Status: inferred.

7. Que pasa con leads de marcas?
   - Impacto: hoy se guardan pero no hay operacion visible.
   - Recommended answer: inbox owner con status `new`, `reviewed`, `contacted`, `won`, `lost`, notas y export.
   - Status: inferred.

8. Que eventos propios deben persistirse?
   - Impacto: habilita reporting real.
   - Recommended answer: map_view, country_select, video_panel_open, youtube_fallback_open, sponsor_impression, sponsor_click, inquiry_submit, poll_vote.
   - Status: inferred.

9. Como se separan analytics YouTube vs TravelYourMap?
   - Impacto: reduce riesgo de compliance y mejora claridad comercial.
   - Recommended answer: UI con dos familias: "Datos YouTube" con timestamp y "Actividad TravelYourMap" first-party.
   - Status: inferred.

10. Como entra esto en pricing?
    - Impacto: define gates de plan.
    - Recommended answer: Free = mapa publico limitado; Creator = embed + basic sponsor slot; Pro = sponsor hub + media kit + reporting; Agency = portafolio.
    - Status: inferred.

### Low

11. Copy recomendado en player?
    - Recommended answer: "Reproductor oficial de YouTube" y "Abrir en YouTube"; no "cuenta como view".
    - Status: inferred.

12. Copy recomendado para marcas?
    - Recommended answer: "Patrocina destinos dentro del mapa del creador", no "anunciate en sus videos".
    - Status: inferred.

### Future

13. OAuth read-only para analytics avanzadas de YouTube.
    - Reason: requiere consentimiento, revocacion, borrado y compliance mas pesado.
    - Status: deferred.

14. Portal de marcas y pagos de campañas.
    - Reason: depende de tener pipeline de leads probado.
    - Status: deferred.

15. Agency workspace multi-canal.
    - Reason: depende de permisos, billing y reporting multi-tenant.
    - Status: deferred.

## Decision pendiente para cerrar investigacion

Elegir el wedge comercial v1:

- Recomendado: "Media kit interactivo + sponsor leads por destino".
- Alternativa: "Analytics geografico para creadores".
- Por que recomiendo media kit: se puede vender con datos propios y experiencia publica sin necesitar OAuth ni prometer impacto directo en views de YouTube.

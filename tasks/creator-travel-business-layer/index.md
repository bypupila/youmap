# Tasks: Creator Travel Business Layer

Estado: tanda 1 aplicada. Foco actual: media kit publico + dashboard negocio + pricing. OAuth y portal de marcas quedan como añadidos futuros.

## P0 - Convertir concepto en producto vendible

1. Reposicionar copy y claims.
   - Archivos probables: `src/components/landing/cinematic-landing.tsx`, `src/components/onboarding/onboarding-flow.tsx`, `src/lib/plans.ts`, `src/app/page.tsx`.
   - Actividad: cambiar propuesta hacia media kit interactivo, sponsor leads y mapa por destino; eliminar o suavizar promesas basadas en YouTube views.
   - Validacion: copy no promete views/revenue y comunica valor independiente.

2. Separar analytics YouTube vs TravelYourMap.
   - Archivos probables: `src/components/map/map-experience.tsx`, `src/components/analytics-dashboard.tsx`, `src/app/api/analytics/[channelId]/route.ts`.
   - Actividad: mostrar timestamps de datos YouTube y seccion independiente de actividad TravelYourMap.
   - Validacion: ningun KPI comercial mezcla origenes sin label.

3. Crear modelo de eventos first-party.
   - Archivos probables: nueva migracion Neon, `src/app/api/map/events/route.ts`, helpers en `src/lib`.
   - Eventos: `map_view`, `country_select`, `video_panel_open`, `youtube_external_open`, `sponsor_impression`, `sponsor_click`, `inquiry_submit`, `poll_vote`.
   - Validacion: eventos se guardan con hash anonimo y no se registran para `made_for_kids=true` cuando aplica.

4. Corregir sponsor attribution.
   - Archivos probables: `src/app/api/sponsors/click/route.ts`, migracion si hace falta indice compuesto.
   - Actividad: persistir `channel_id` y `country_code` en clicks; agregar impresiones de sponsor.
   - Validacion: `/api/sponsors/stats` puede reportar por sponsor/canal/pais.

5. Crear sponsor inbox para creator.
   - Archivos probables: nueva API `src/app/api/sponsors/inquiries/route.ts`, componente en dashboard/map rail.
   - Actividad: listar leads, cambiar status, agregar notas, ver presupuesto/contacto.
   - Validacion: owner ve propuestas reales; viewer no accede.
   - Estado: implementado (listado + cambio de estado + acceso owner-only + demo mode).

6. Crear media kit publico.
   - Archivos probables: `src/app/u/[username]/media-kit/page.tsx` o seccion linkable en `/u/[username]`.
   - Actividad: resumen de destinos, videos mapeados, sponsors, fan vote, CTA de marca, datos frescos.
   - Validacion: ruta comparte metadata, no depende de reproducir embeds y funciona responsive.

7. Dashboard negocio owner.
   - Archivos probables: `src/app/dashboard/page.tsx`, `src/components/map/map-experience.tsx`, nuevos componentes business.
   - Actividad: agregar vista/panel de negocio con leads, stats de sponsors, actividad del mapa y link media kit.
   - Validacion: creator entiende que hacer despues de importar el canal.

8. Plan gating real.
   - Archivos probables: `src/lib/plans.ts`, billing/subscription checks, sponsor manager.
   - Actividad: limitar slots y features por plan; comunicar upgrade sin bloquear mapa base.
   - Validacion: Free/Creator/Pro reflejan capacidades reales.

## P1 - Crecimiento y conversion

9. SEO por creator/destino.
   - Archivos probables: `src/app/u/[username]/page.tsx`, `src/app/sitemap.ts`, nuevas rutas de destino si se decide.
   - Actividad: mejorar metadata por pais/top destinos y crear anchors/indexables sin duplicar contenido inutil.
   - Validacion: sitemap incluye rutas utiles y pages tienen titles/descriptions especificos.

10. Export/share para marcas.
    - Actividad: copy link media kit, PDF/print stylesheet o snapshot HTML.
    - Validacion: el creator puede enviar un link profesional a una marca.

11. Notificaciones de leads.
    - Actividad: email al creator al recibir inquiry; confirmacion a marca.
    - Validacion: lead no queda enterrado solo en DB.

## P2 - Expansion

12. OAuth read-only de YouTube.
    - Actividad: conectar canal con consentimiento y preparar datos autorizados.
    - Dependencia: Terms/Privacy finales, revocacion y deletion policy.

13. Brand portal.
    - Actividad: acceso para marcas, seguimiento de propuestas y campaign briefs.
    - Dependencia: sponsor inbox probado.

14. Agency workspace.
    - Actividad: multi-canal, roles, reporting consolidado.
    - Dependencia: plan Agency y permisos.

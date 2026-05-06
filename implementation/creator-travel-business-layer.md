# Implementation Contract: Creator Travel Business Layer

Fecha: 2026-05-06

## Objetivo

Hacer que TravelYourMap sea una herramienta de negocio para creadores de viaje en YouTube: una capa geografica y comercial independiente que usa el embed oficial como contenido, pero vende valor propio: mapa publico, media kit, sponsor leads, fan vote y analytics first-party.

## Principio de producto

YouTube sigue siendo el lugar del video. TravelYourMap debe ser el lugar donde el creador convierte su catalogo en mapa, media kit y oportunidades comerciales por destino.

## Scope v1 recomendado

1. Reposicionar producto y copy.
   - Home, onboarding, pricing y mapa publico deben vender "media kit interactivo para sponsors de viaje".
   - Evitar claims como "cada reproduccion cuenta como view" o "TravelYourMap aumenta revenue de YouTube".

2. Separar metricas.
   - "Datos YouTube": views/likes/comments con timestamp de refresh.
   - "Actividad TravelYourMap": visitas al mapa, clicks de sponsor, inquiries, votos, paises seleccionados, aperturas de panel.

3. Persistir analytics propios.
   - Crear eventos server-side con hashing anonimo.
   - No trackear video/player para `made_for_kids=true`.
   - No usar esos eventos para simular YouTube views.

4. Convertir sponsors en pipeline real.
   - Inbox de propuestas para el creator.
   - Estados comerciales y notas.
   - Stats por sponsor: impresiones, clicks, CTR, inquiries, paises/rutas.
   - Corregir atribucion de `sponsor_clicks.channel_id`.

5. Crear media kit publico.
   - Ruta o seccion shareable para marcas.
   - Debe mostrar destinos, videos mapeados, top paises, fan vote, sponsor slots, CTA de propuesta y fecha de datos YouTube.
   - Debe poder funcionar aunque el embed no se reproduzca.

6. Dashboard negocio para creator.
   - Vista "Negocio" dentro del dashboard o rail owner.
   - Leads nuevos, sponsor performance, top destinos propios, actividad del mapa, link de media kit.

7. Plan gating.
   - Free: mapa publico limitado.
   - Creator: mapa + embed + 1 sponsor.
   - Creator Pro: sponsor inbox, media kit, reporting y mas slots.
   - Agency: portafolio multi-canal futuro.

## Non-goals v1

- No OAuth read-only de YouTube.
- No claims de revenue garantizado.
- No anuncios propios sobre, dentro o pegados al player.
- No brand portal completo.
- No marketplace de marcas.
- No pagos de campañas dentro de TravelYourMap.

## Riesgos y mitigaciones

- Riesgo: la plataforma parezca agregador de embeds.
  - Mitigacion: media kit, sponsors, fan vote, mapa y analytics propios como experiencia principal.

- Riesgo: analytics mezclen datos YouTube con datos propios.
  - Mitigacion: separar labels, timestamps y modelos de datos.

- Riesgo: sponsor UI interfiera con YouTube player.
  - Mitigacion: sponsors solo en rails/cards separados, nunca overlays del iframe.

- Riesgo: no haya prueba comercial para marcas.
  - Mitigacion: trackear impresiones/clicks/inquiries first-party y crear dashboard de pipeline.

## Acceptance criteria

- Un visitante entiende que TravelYourMap es un mapa/media kit, no un clon de YouTube.
- Un creador puede compartir un link publico vendible a marcas.
- Una marca puede enviar una propuesta desde el mapa o media kit.
- El creator puede ver y gestionar esas propuestas.
- Sponsor clicks e impressions quedan atribuidos al canal y destino.
- Analytics de YouTube y TravelYourMap aparecen separados.
- No hay sponsor UI encima del embed.
- Los planes reflejan capacidades reales.
- Lint/build pasan cuando se implemente.
- QA responsive valida mapa publico, dashboard owner, media kit, sponsor inbox y onboarding.

## Decision abierta

Confirmar si el wedge v1 sera "Media kit interactivo + sponsor leads por destino". Esa decision desbloquea orden de ejecucion, copy y gating.

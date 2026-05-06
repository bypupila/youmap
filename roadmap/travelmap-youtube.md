# Roadmap: TravelYourMap y YouTube

Fecha: 2026-05-05

## Actual

Tema activo: reproduccion in-platform con embed oficial de YouTube y ajuste del contrato de API para no depender de practicas riesgosas.

## Futuro cercano

- OAuth read-only para creadores.
  - Motivo: habilita analytics de YouTube por destino con menor riesgo que Non-Authorized Data.
  - Dependencias: Terms, Privacy, revocacion, borrado y refresh cada 30 dias.

- Compliance audit y extension de cuota.
  - Motivo: escala de imports, refreshes y analytics puede superar 10,000 units/day.
  - Dependencias: app productiva estable, documentacion legal, demo de flujos y evidencia de deletion policy.

- Privacy enhanced mode como toggle.
  - Motivo: algunos mercados/clientes pueden priorizar `youtube-nocookie.com`.
  - Tradeoff: puede afectar personalizacion de ads y experiencia de cuenta; requiere decision producto/legal.

- Analytics nativas de TravelYourMap.
  - Motivo: sponsors pueden venderse mejor con opens, saves, votes, clicks y leads propios sin depender de metricas YouTube derivadas.
  - Dependencias: eventos PostHog/server-side, consent y dashboards separados.
# Roadmap addendum: Creator Travel Business Layer

Fecha: 2026-05-06

## Tema

TravelYourMap como capa comercial independiente para creadores de viaje en YouTube.

## Por que queda en roadmap

El embed oficial y la gobernanza de YouTube API cubren la base tecnica. La siguiente etapa ya no es solo compliance: es convertir el mapa en media kit, sponsor hub y sistema de leads con metricas propias.

## Prioridad sugerida

P0 despues de estabilizar la integracion embed/API, porque define la monetizacion real de TravelYourMap.

## Decisiones a cerrar

- Wedge v1: recomendado "Media kit interactivo + sponsor leads por destino".
- Si el dashboard principal sera mapa con panel negocio o dashboard tabulado con mapa + negocio.
- Si media kit vive como `/u/[username]/media-kit` o como seccion exportable dentro de `/u/[username]`.

## Branches futuras

- OAuth read-only para analytics avanzadas.
- Portal de marcas.
- Agency workspace multi-canal.
- Pagos/contratos de campanas dentro de TravelYourMap.

# Creator Business Collaborations Phase 1

## Status
Implemented for phase 1. Global typecheck remains pending until unrelated syntax errors in existing dirty files are resolved.

## Problem
El creador hace muchas colaboraciones con hoteles, productos, experiencias, afiliados y sponsors, pero el panel actual trata casi todo como campanas, pagos o sponsors publicos. Falta una herramienta privada para evaluar si una colaboracion conviene antes de aceptarla y luego dejar registro operativo de lo entregado, lo recibido, los costos, el esfuerzo y el resultado.

## Desired Behavior
TravelYourMap debe permitir que una colaboracion viva dentro de `Negocio` como una campana enriquecida. El creador puede crear una oportunidad manual o desde un lead, evaluar condiciones, decidir si conviene, aceptarla, registrar valores recibidos/costos/esfuerzo, operar pendientes desde agenda, cerrar la colaboracion y ver balance privado sin exponer datos financieros a marcas ni viewers.

## Resolved Language
- `Colaboracion`: ver `CONTEXT.md`.
- `Balance de colaboracion`: ver `CONTEXT.md`.
- `Sponsor Kit`: ver `CONTEXT.md`.

## Decisions
- `Colaboraciones` vive dentro de `Negocio`; no sera una pestaña principal del sidebar.
- La entidad operativa sigue siendo `Campana`; `Colaboraciones` es una vista/filtro para campanas con `agreement_type`.
- `Sponsors` queda para presencia publica, CTA, tracking, reportes y visibilidad en mapa.
- Una colaboracion no crea sponsor publico automaticamente. Puede vincularse a un sponsor existente o crear uno desde una accion guiada futura.
- La evaluacion previa y el registro final son el mismo objeto con estados existentes de campana.
- Estados existentes se reutilizan: `lead`, `proposal`, `negotiation`, `active`, `delivered`, `paid`, `lost`.
- El score es manual y estructurado. El creador elige `Conviene`, `Revisar`, `No conviene` o `Sin evaluar`.
- Los datos automaticos del mapa/canal no determinan el score v1.
- Las oportunidades rechazadas se guardan como historial privado y no entran al balance principal.
- El balance principal solo suma campanas `active`, `delivered` y `paid`.
- `Pipeline` y `Balance real` deben estar separados.
- Los items financieros usan presets activables; solo se guardan items activados.
- Cada item activado puede tener valor estimado y real.
- La moneda vive en la campana, no por item.
- No hay conversion automatica de monedas en v1; los agregados se agrupan por moneda.
- Valor en especie se muestra separado de dinero real y tambien dentro de un total combinado.
- Esfuerzo puede calcularse por tarifa/hora o precio por proyecto.
- El minimo para aceptar es privado y no bloquea aceptar; si no se cumple, se advierte y se pide nota.
- No se registran documentos sensibles, contratos, facturas, screenshots, emails completos ni links a material sensible.
- Las notas internas son breves y operativas.
- Repeticiones/renovaciones crean un registro nuevo, prellenado como borrador editable.
- Al evaluar una nueva colaboracion, se muestra historial privado de la misma marca por `sponsor_id` o `brand_name` normalizado.
- No se crea entidad `Brand` privada en v1.
- Las colaboraciones manuales necesitan contacto principal opcional en campana.
- Dinero recibido reutiliza `sponsor_campaign_payments`.
- Servicios prometidos reutilizan `sponsor_campaign_deliverables`.
- Valor en especie, costos propios y esfuerzo usan una tabla nueva `sponsor_campaign_balance_items`.
- Agenda comercial mezcla entregables, pagos y balance items en una sola lista priorizada.
- UI de `Negocio` tendra navegacion secundaria simple: Resumen, Leads, Campanas, Colaboraciones, Balance, Agenda.
- Vista default de `Negocio`: Resumen.
- Vista `Colaboraciones` muestra marca, tipo de acuerdo, estado, resultado de evaluacion, destino, valores, costos, balance, proximos pendientes y accion principal.

## Constraints
- Responsive: la navegacion secundaria y las listas deben funcionar en mobile sin overflow horizontal.
- UX: acciones visibles deben persistir cambios reales o estar claramente deshabilitadas.
- Seguridad/contenido: no incentivar guardar documentos ni datos sensibles.
- Privacidad: balance, minimos, costos, esfuerzo y notas son privados del creador.
- Mantenibilidad: reutilizar `sponsor_campaigns`, `sponsor_campaign_deliverables`, `sponsor_campaign_payments`, CRM actual y agenda comercial.
- Analitica/compliance: no mezclar metricas de YouTube con resultados propios de TravelYourMap en esta fase.

## Open Questions
No quedan preguntas bloqueantes para fase 1. Sponsor Kit privado queda para un grill separado de fase 2.

## Phase 1 Artifacts
- Schema: `neon/migrations/0026_sponsor_campaign_collaborations.sql`.
- CRM/domain service: `src/lib/sponsor-crm.ts`.
- Creator business API: `src/app/api/creator/sponsor-crm/route.ts`.
- Creator readiness check: `src/lib/creator-admin-data.ts`.
- UI: `src/components/map/map-admin-proposal-v2.tsx`.
- Product glossary: `CONTEXT.md`.

## Verification Notes
- Targeted ESLint passed for the phase 1 touched TypeScript files.
- Global `tsc --noEmit --incremental false` is blocked by pre-existing syntax errors in `src/components/admin/admin-analytics-overview.tsx` and `src/components/creator/creator-admin-panel.tsx`.
- Browser verification was not run because the local app cannot be trusted to compile until those syntax errors are fixed.

## PRD
docs/prd/creator-business-collaborations-phase-1.md

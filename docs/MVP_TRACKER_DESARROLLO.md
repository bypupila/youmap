# Tracker de Desarrollo MVP

Ultima actualizacion: 2026-05-25  
Estado global: `implementado (pendiente QA final de negocio)`

Referencias:
- Alcance cerrado: [MVP_DECISIONES_CERRADAS_176.md](./MVP_DECISIONES_CERRADAS_176.md)
- Plan por prioridad: [MVP_PLAN_EJECUCION_PRIORIZADO.md](./MVP_PLAN_EJECUCION_PRIORIZADO.md)
- Fuera de MVP: [BACKLOG_POST_MVP_ETAPAS_FUTURAS.md](./BACKLOG_POST_MVP_ETAPAS_FUTURAS.md)

## Etapas del MVP y estado

- [x] Etapa Cero - Base de datos y contrato de datos
- [x] Etapa Uno - Extraccion YouTube sin ciudades en videos + sponsor detectado
- [x] Etapa Dos - Panel administrativo de sponsors y asignacion masiva
- [x] Etapa Tres - Votaciones pais -> ciudades
- [x] Etapa Cuatro - Registro obligatorio de viewers + cumplimiento
- [x] Etapa Cinco - Analitica minima de producto, creador, sponsor y pais
- [x] Etapa Seis - Demo no persistente + canal real autorizado en modo lectura
- [x] Etapa Siete - Operacion de salida, monitoreo y rollback

## Avance implementado en codigo (2026-05-25)

- Etapa Cero:
  - migracion `0011_mvp_sponsor_detection_and_viewers.sql` con estado de sponsor por video, metadatos de deteccion, `is_primary` por regla sponsor-video y tablas de viewer/cumplimiento.
- Etapa Uno:
  - importacion YouTube con deteccion de sponsor por metadata ya disponible.
  - persistencia de videos sin ciudad operativa (pais como nivel principal en flujo de video).
- Etapa Dos:
  - endpoint de asignacion masiva `POST /api/map-admin/sponsors/bulk-assign` con preview y auditoria por motivo.
  - UI de bulk edit en panel actual de creador (tabla, filtros, seleccion, preview, asignacion).
- Etapa Tres:
  - cierre de votacion de pais crea borrador idempotente de votacion de ciudades para el pais ganador.
  - la creacion automatica de borrador de ciudades queda auditada en `creator_activity_log` para trazabilidad operativa.
- Etapa Cuatro:
  - endpoint separado `POST /api/auth/register-viewer` con ciudad/pais obligatorios y consentimientos versionados.
  - UI de registro viewer en `/auth/viewer-register`.
  - endpoint de consulta/actualizacion de consentimientos en `/api/auth/consents`.
  - pantalla de gestion de consentimientos en `/auth/consents`.
  - votaciones bloqueadas para anonimos en backend (`/api/map/fan-votes/vote`, `/api/map/polls/[pollId]/vote`) con respuesta `401` y flujo de registro obligatorio.
  - flujo de eliminacion de cuenta viewer implementado (`DELETE /api/auth/viewer-account`) con revocacion de sesion, auditoria y limpieza de cookie.
- Etapa Cinco:
  - API de analitica extendida con metricas internas de Travel Your Map (map views, video opens, sponsor clicks, poll votes).
  - dashboard de analitica actualizado con origen de metrica (YouTube vs Travel Your Map).
  - dashboard de analitica de creador con filtro de periodo (`7/30/90/180 dias`) para metrica interna.
  - instrumentacion interna adicional en mapa para favoritos, ver mas tarde y horas reproducidas dentro de Travel Your Map.
  - paneles de analitica (creador y admin) ampliados con favoritos, ver mas tarde y horas reproducidas (Travel Your Map).
  - visual de analitica embebida en tab de actividad del panel actual de creador.
  - endpoint global `GET /api/admin/analytics/overview` para superadmin con:
    - producto (viewers/creators registrados, actividad mensual, interacciones 30d)
    - top creadores
    - top sponsors
    - geografia de viewers y eventos.
  - modulo visual `AdminAnalyticsOverview` integrado en `/admin`.
  - filtro por periodo en analytics de admin (`7/30/90/180 dias`) via `GET /api/admin/analytics/overview?days=`.
- Etapa Seis:
  - indicador visual explicito de `Modo demo · sin persistencia` en experiencia de mapa.
  - llamada a accion visible a registro real (`Crear cuenta gratis`) desde experiencia demo con atribucion de origen.
  - bloqueo de vista creator para canal autorizado `by.pupila` en rutas publicas de mapa.
- Etapa Siete:
  - endpoint publico `GET /api/status` con estado operativo consolidado e indicadores de 24 horas.
  - pagina publica `/status` con servicios, severidad y metricas resumidas.
  - bloqueo backend de escritura para modo demo en rutas de edicion/votacion para evitar persistencia accidental.
  - ruta publica `by.pupila` forzada en modo viewer en superficies de mapa.
  - endpoint superadmin `GET /api/admin/release/go-no-go` con checklist ejecutable.
  - panel `ReleaseReadinessPanel` integrado en `/admin` para gate operativo.
  - endpoint `GET /api/admin/ops/alerts` y panel `OpsAlertsPanel` para alertas criticas/altas.

## Criterio de cierre de cada etapa

- Codigo implementado y probado.
- Permisos por rol validados.
- Eventos y auditoria verificados.
- Documentacion actualizada.

## Regla de actualizacion

- Cada vez que una etapa cambie de estado, actualizar este archivo el mismo dia.

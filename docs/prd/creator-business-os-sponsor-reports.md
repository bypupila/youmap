# PRD: Creator Business OS y sponsor reports

## Objetivo
Convertir el panel del creador en un sistema administrativo de negocio para influencers de viajes, empezando por una vertical completa de reportes privados por sponsor que una marca pueda abrir y entender sin acceso al panel interno.

## Alcance v1

### Panel privado
- Mantener `/creator-panel` como superficie principal del creador.
- En la pestaña Sponsors, agregar acciones reales para crear, copiar, abrir y revocar links privados de reporte.
- Permitir preparar un email al contacto de la marca con el link privado del reporte.
- Permitir programar reportes por sponsor con destinatario, cadencia, ejecución manual, pausa/reactivación y último estado visible.
- Permitir exportar el reporte privado desde el navegador como documento imprimible/PDF brand-ready.
- Mostrar estado de reportes por sponsor cuando existan.
- Agregar pestaña Media Kit para editar visibilidad, headline, bio, nota de audiencia, email comercial, rate card, CTA y paises destacados.
- Agregar pestaña Negocio para gestionar leads, campañas, entregables y pagos.
- Agregar agenda comercial en Negocio para priorizar entregables y pagos con fecha.
- Agregar export comercial en Negocio para descargar CRM CSV y copiar resumen ejecutivo.
- Agregar automatizaciones comerciales internas en Negocio con acciones reales.
- Agregar portal privado de marca por campaña con links revocables.
- Agregar acceso de marca por email y codigo para portales generados desde flujos comerciales.
- Agregar renovaciones comerciales v1 para convertir campañas entregadas o pagadas en nuevas propuestas accionables.
- Agregar Business OS readiness en el aside del panel para mostrar capacidades listas, migraciones requeridas pendientes y configuracion opcional de email.

### Reporte privado por sponsor
- Crear ruta publica no indexable `/sponsor-report/[token]`.
- Resolver el token contra un hash almacenado, no guardar el token plano.
- Mostrar:
  - Logo de TravelYourMap.
  - Logo/avatar del creador desde `channels.thumbnail_url`.
  - Logo de sponsor desde `sponsors.logo_url`.
  - Nombre de creador, sponsor y periodo.
  - Impresiones, clicks, usuarios unicos anonimos y CTR.
  - Video mas abierto dentro de TravelYourMap.
  - Video mas visto segun datos importados de YouTube.
  - Top paises por interacciones.
  - Serie diaria de impresiones/clicks.
  - Alcance del sponsor: global, paises o videos.
- Incluir accion de export de reporte que use impresion del navegador y layout optimizado para PDF.
- Separar visualmente metricas `TravelYourMap` de metricas `YouTube importado`.

### APIs
- API autenticada para listar y crear reportes por sponsor.
- API autenticada para revocar reportes.
- API publica por token para leer un reporte activo.
- API autenticada para listar, crear, actualizar, pausar, reactivar y ejecutar programaciones de reporte.
- Runner protegido para procesar programaciones vencidas.
- Las APIs deben validar propiedad del canal/sponsor y nunca devolver datos de otros sponsors.

### Base de datos
- Agregar tabla `sponsor_report_links` con token hasheado, estado, revocacion y tracking basico de vistas.
- Agregar tabla `sponsor_report_schedules` para cadencia, destinatario, proximo envio, ultimo reporte y ultimo error.
- Agregar tabla `media_kit_settings` para configuracion editable del media kit publico.
- Agregar tablas `sponsor_campaigns`, `sponsor_campaign_deliverables` y `sponsor_campaign_payments`.
- Agregar tabla `brand_portal_links` para compartir campañas por token privado revocable.
- Extender `brand_portal_links` con acceso opcional por email/codigo, contador de accesos y ultimo acceso concedido.
- Detectar desde el panel si esas tablas/columnas existen antes de presentar el sistema como listo.

### Media Kit publico
- Crear `/u/[username]/media-kit` con SEO, canonical, metricas comerciales y CTA funcional.
- Usar defaults derivados del canal, videos, paises, sponsors y eventos cuando el creador todavia no configuro la pagina.
- Conectar el formulario publico a `sponsor_inquiries`.

### CRM Comercial
- Mostrar leads provenientes de `sponsor_inquiries`.
- Permitir cambiar estado de lead: nuevo, revisado, contactado, propuesta enviada, negociacion, ganado o perdido.
- Permitir convertir un lead en campaña.
- Permitir crear campañas manuales.
- Permitir avanzar estado de campaña.
- Permitir agregar y actualizar entregables.
- Permitir agregar y actualizar pagos.
- Mostrar agenda comercial con vencidos y próximos, mezclando entregables y pagos en una vista accionable.
- Permitir avanzar el siguiente estado de un entregable o marcar pagos como vencidos/pagados desde la agenda.
- Permitir exportar leads, campañas, entregables y pagos a CSV desde el panel.
- Permitir copiar un resumen ejecutivo del pipeline comercial.

### Automatizaciones Comerciales v1
- Detectar leads nuevos o revisados sin contacto y permitir marcarlos como contactados.
- Detectar pagos vencidos y permitir marcarlos como vencidos.
- Detectar campañas entregadas sin pagos y permitir crear pago final.
- Detectar campañas activas/entregadas sin entregable de reporte y permitir agregarlo.
- Recomendar pricing por destino sin sponsor usando views, videos y ciudades.
- Permitir crear campaña base desde una oportunidad de pricing.
- Detectar campañas entregadas o pagadas sin renovación abierta.
- Permitir crear una renovación como nueva campaña con budget sugerido, entregable de propuesta, entregable de reporte y pago de reserva.
- Permitir crear la renovación con portal privado y email a la marca cuando la campaña conserva un contacto de lead.
- Permitir que los reportes de sponsor se generen de forma programada y se envien por email si el proveedor transaccional esta configurado.

### Portal de Marca v1
- Permitir crear, copiar, abrir y revocar un link privado por campaña.
- Crear `/brand-portal/[token]` no indexable.
- Mostrar a la marca estado de campaña, objetivo, entregables, pagos, budget y progreso.
- Soportar portal con acceso por email y codigo cuando la propuesta se envia a un contacto de marca.

### Renovaciones Comerciales v1
- Una campaña en estado entregada o pagada puede generar una nueva propuesta de renovación.
- La renovación hereda marca, sponsor, objetivo base y duración aproximada.
- La renovación conserva el contacto del lead original cuando existe.
- El budget sugerido incrementa el budget anterior para abrir negociación.
- La campaña original no se modifica; la nueva campaña queda trazada en notas internas.
- Si existe contacto, el creador puede generar portal privado y enviar la renovación por email; si falta Resend, el panel abre un `mailto:` listo.
- El portal de renovacion enviado por email incluye codigo de acceso para la marca.

### Business OS readiness
- Mostrar estado privado de reportes por sponsor, Media Kit, CRM comercial, portal de marca, acceso de marca, reportes programados y email automatico.
- Separar capacidades requeridas de configuracion opcional.
- Si falta una capacidad requerida, mostrar una accion funcional para copiar el comando de migracion.
- No bloquear la carga del panel si una tabla o columna falta; mostrar el estado faltante de forma accionable.

## Fuera de alcance v1
- PDF server-side generado automaticamente.
- Portal de marca con login.
- Marketplace de marcas.

## Plan maestro posterior
- Ampliaciones del `Media Kit` publico: casos de estudio, paquetes comerciales y comparativas por destino.
- Automatizaciones externas de campañas: recordatorios por email y cuentas persistentes de marca.
- Automatizaciones: propuestas por destino enriquecidas.

## Criterios de aceptacion
- Un creador autenticado puede crear un link de reporte para un sponsor propio.
- Un creador puede copiar y abrir el link generado.
- Un creador puede preparar un email dirigido a la marca con el link privado del reporte.
- Un creador puede programar, actualizar, ejecutar ahora, pausar y reactivar reportes de sponsor.
- Una marca o creador puede guardar/imprimir el reporte privado como PDF desde el navegador.
- Un creador puede revocar el link y el token deja de mostrar datos.
- Un creador puede editar y abrir su Media Kit desde `/creator-panel`.
- Una marca puede enviar una solicitud desde `/u/[username]/media-kit`.
- Un creador puede convertir una solicitud de marca en campaña.
- Un creador puede crear entregables y pagos para una campaña.
- Un creador puede ver una agenda comercial priorizada y ejecutar acciones reales sobre entregables o pagos desde esa agenda.
- Un creador puede exportar el CRM comercial a CSV y copiar un resumen ejecutivo del pipeline.
- Un creador puede ejecutar recomendaciones comerciales sin botones decorativos: cada accion persiste un cambio real.
- Un creador puede crear una renovación desde una campaña entregada o pagada.
- Un creador puede crear una renovación con email/portal para la marca cuando la campaña tiene contacto asociado.
- Una marca puede abrir un portal privado de campaña sin acceder al admin.
- Una marca con portal protegido puede ingresar con email y codigo sin tener cuenta global de TravelYourMap.
- El panel muestra Business OS readiness con capacidades listas/faltantes y una accion funcional para copiar el comando de migracion cuando corresponde.
- El reporte muestra logos de plataforma, creador y sponsor, con fallback visual cuando falta una imagen.
- El reporte muestra metricas reales derivadas de `map_events`, `sponsor_clicks`, `videos` y reglas de alcance del sponsor.
- El reporte no se indexa y no necesita sesion.
- Las acciones visibles en Sponsors tienen funcion real o estado disabled claro.
- `npm run lint` y `npx tsc --noEmit --incremental false` pasan o dejan errores documentados.

## Riesgos
- Si faltan eventos historicos de impresiones, el reporte puede mostrar clicks con impresiones bajas o cero. La UI debe explicar que las impresiones dependen de tracking disponible.
- La atribucion por sponsor global/pais/video se calcula desde reglas actuales del sponsor; si una marca cambio alcance en el tiempo, v1 reporta contra el alcance actual.

# Creator Business OS y reportes de sponsor

## Status
Implementing

## Problem
El panel del creador ya administra mapa, videos, paises, votaciones, sponsors, audiencia y actividad, pero todavia no opera como un centro completo de negocio para un influencer de viajes. La brecha mas importante para monetizacion es que una marca no recibe un reporte privado, claro y compartible con resultados del sponsor dentro de TravelYourMap.

## Desired Behavior
TravelYourMap debe funcionar como un Creator Business OS para influencers de viajes:

- El creador administra contenido, destinos, audiencia, sponsors, leads, media kit, campanas y actividad desde `/creator-panel`.
- La pestaña Negocio incluye una agenda comercial con entregables y pagos ordenados por urgencia.
- La pestaña Negocio permite exportar el CRM comercial y copiar un resumen ejecutivo del pipeline.
- Cada sponsor puede recibir un link privado y revocable con analitica especifica de su presencia.
- El creador puede preparar un email operativo con el link privado del reporte sin copiarlo manualmente.
- El creador puede programar reportes por sponsor con destinatario, cadencia y controles de ejecucion/pausa.
- El panel privado muestra Business OS readiness para saber si las capacidades requeridas y la configuracion de email estan disponibles antes de ejecutar flujos comerciales.
- La marca o el creador puede usar un export de reporte imprimible para guardar el reporte como PDF desde el navegador.
- El reporte de sponsor muestra logo de plataforma, logo del creador, logo de la marca, resumen ejecutivo y metricas separadas por fuente.
- Las metricas de TravelYourMap y YouTube se muestran como fuentes distintas para evitar promesas incorrectas.
- Ningun boton del flujo principal debe ser decorativo: toda accion visible debe ejecutar una funcion real, abrir una ruta existente o estar fuera del alcance de la UI implementada.

## Resolved Language
- `Creator OS`: panel privado del creador en `/creator-panel`.
- `Sponsor report`: reporte privado por token para una marca concreta.
- `TravelYourMap analytics`: eventos first-party capturados en mapa publico, como impresiones, clicks, aperturas de video y guardados.
- `YouTube analytics`: datos importados desde YouTube, como views, likes y comentarios; sirven como contexto, no como resultado atribuido a TravelYourMap.
- `Media kit`: pagina publica/comercial del creador para marcas, ubicada en `/u/[username]/media-kit`.
- `Business OS readiness`: estado operativo privado que confirma tablas, columnas y configuracion opcional necesarias para usar el sistema comercial sin botones fallidos.
- `Agenda comercial`: vista priorizada de entregables y pagos próximos o vencidos para operar campañas sin perder fechas.
- `Export comercial`: descarga CSV y resumen copiable de leads, campañas, entregables, pagos y pipeline.

## Decisions
- El primer slice implementable sera reporte por sponsor, no campana completa.
- El reporte se comparte con link privado por token revocable.
- No se implementa PDF server-side automatico en v1.
- El envio de reporte v1 usa `mailto:` para envio manual y Resend opcional para envio programado automatico.
- El panel global `/admin` queda reservado a operaciones de plataforma y superadmin.
- `/map-admin-proposal` debe tratarse como legacy/propuesta; el producto real vive en `/creator-panel`.
- El Media Kit v1 usa configuracion editable, defaults generados desde datos del canal y formulario publico conectado a sponsor inquiries.
- El CRM comercial v1 vive en la pestaña Negocio y cubre leads, campañas, entregables y pagos basicos.
- Automatizaciones comerciales v1 vive en Negocio: detecta leads sin contactar, pagos vencidos, campañas entregadas sin pago, campañas sin reporte y oportunidades de pricing por destino.
- Portal de marca v1 usa links privados revocables por campaña para compartir estado, entregables y pagos con la marca.
- Acceso de marca v1 usa email y codigo sobre el portal privado cuando el flujo comercial tiene contacto de marca.
- Renovaciones comerciales v1 crea una nueva propuesta desde campañas entregadas o pagadas, sin modificar la campaña original.
- Renovaciones comerciales v1 conserva el contacto del lead original y puede enviar la propuesta por Resend o abrir un `mailto:` listo si falta configuración transaccional.
- Reportes programados v1 reutiliza el cron diario existente de data governance para no exceder los dos crons configurados en Vercel Hobby.
- Export de reporte v1 usa impresion del navegador con CSS dedicado, no generacion server-side.
- Business OS readiness v1 vive en el aside de `/creator-panel` y ofrece una accion concreta para copiar el comando de migracion cuando falta una capacidad requerida.
- Agenda comercial v1 se deriva de campañas, entregables y pagos existentes; sus botones avanzan estados reales mediante el CRM.
- Export comercial v1 se genera en cliente desde el CRM cargado, sin exponer nuevos endpoints.

## Constraints
- UX responsive para desktop y mobile.
- SEO: los reportes privados por token no deben indexarse.
- Seguridad: el token publico no debe exponer datos de otros sponsors, otros canales ni datos personales identificables.
- Mantenibilidad: reutilizar `map_events`, `sponsor_clicks`, `sponsors`, `videos`, `video_locations`, `channels` y helpers existentes.
- Analitica: separar explicitamente fuente TravelYourMap vs fuente YouTube.
- Accesibilidad: botones con estado disabled/cargando cuando corresponda y labels claros.
- Operacion: si faltan migraciones requeridas, el panel debe explicarlo sin romper la carga ni mostrar acciones mudas.
- Operacion diaria: fechas de entregables y pagos deben ser visibles en una sola lista priorizada.
- Portabilidad: el creador debe poder sacar sus datos comerciales a CSV y compartir un resumen de pipeline sin pedir soporte tecnico.

## Open Questions
- Cuentas persistentes de marca y recordatorios recurrentes quedan como fases posteriores del plan maestro.

## PRD
docs/prd/creator-business-os-sponsor-reports.md

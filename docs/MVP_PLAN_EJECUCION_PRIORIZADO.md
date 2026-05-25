# Plan de Ejecucion Priorizado para Cierre de MVP

Fecha de inicio recomendada: 2026-05-26  
Estado: listo para ejecucion

Fuente funcional: [MVP_DECISIONES_CERRADAS_176.md](./MVP_DECISIONES_CERRADAS_176.md)

## Criterio de prioridad

- Prioridad Critica: bloquea salida a produccion o crea riesgo legal, de datos o de permisos.
- Prioridad Alta: entrega valor principal al creador y al viewer en el MVP.
- Prioridad Media: mejora operativa importante, no bloqueante para primera salida.

## Fase Cero. Base de datos y contrato de datos (Prioridad Critica)

Objetivo: estabilizar el modelo para evitar retrabajo en toda la capa de producto.

### Entregables

- Eliminar uso operativo de ciudades en videos (mantener solo pais en flujo de video).
- Mantener ciudades en votaciones y catalogo geografico global.
- Crear estados de sponsor por video:
  - Confirmado manualmente
  - Detectado automaticamente
  - Pendiente de revision manual
  - No disponible
- Soporte de relacion varios sponsors por video.
- Campos de auditoria obligatorios para cambios manuales de sponsor y estado.
- Campos de atribucion de registro y consentimiento versionado.

### Criterio de cierre

- Migraciones aplican en local y preproduccion sin perdida de integridad.
- Pruebas de lectura/escritura pasan para video, sponsor, votacion, registro y consentimiento.

## Fase Uno. Extraccion YouTube y normalizacion de videos (Prioridad Critica)

Objetivo: ingestar con bajo costo y alta confianza operativa.

### Entregables

- Remover deteccion y escritura de ciudad en pipeline de importacion de videos.
- Mantener pais como unico nivel geografico de video.
- Deteccion de sponsor solo con datos ya obtenidos en la importacion.
- Si no hay alta confianza, marcar revision manual.
- Registrar evidencia y origen de deteccion para auditoria.
- Ejecutar prueba de lote pequeno de validacion real (verdadero positivo y verdadero negativo).

### Criterio de cierre

- No existen falsos positivos evidentes en prueba de lote.
- Videos sin evidencia de sponsor quedan en estado manual sin asignacion automatica.

## Fase Dos. Panel administrativo de sponsors (Prioridad Critica)

Objetivo: permitir operacion real y segura.

### Entregables

- Vista tabular para asignacion masiva con columnas minimas:
  - Titulo de video
  - Pais
  - Estado de sponsor
  - Sponsor asignado
  - Fecha de publicacion
  - Vistas
  - Ultima actualizacion
- Filtros por pais, titulo y estado.
- Seleccion multipagina persistente.
- Vista previa de cambios antes de confirmar.
- Ejecucion asincrona de lotes grandes.
- Registro de motivo obligatorio en cambios manuales.
- Ventana de deshacer controlada.

### Criterio de cierre

- Un administrador puede asignar sponsors a multiples videos en menos de dos minutos para lote de mil videos.
- Todo cambio queda auditado con estado anterior, estado nuevo, usuario y motivo.

## Fase Tres. Votaciones y ciudades solo en esa capa (Prioridad Alta)

Objetivo: simplificar UX de video y preservar valor de participacion comunitaria.

### Entregables

- Crear y operar votaciones por pais.
- Auto creacion de borrador de votacion de ciudades al cerrar votacion de pais.
- Sugerencias de ciudades desde catalogo global.
- Manejo de escenarios con pocas ciudades sugeridas.

### Criterio de cierre

- Flujo completo de pais a ciudades funciona sin pasos manuales de soporte tecnico.

## Fase Cuatro. Registro obligatorio de viewers y cumplimiento (Prioridad Critica)

Objetivo: habilitar analitica de producto confiable y cumplimiento legal.

### Entregables

- Registro viewer obligatorio y gratuito.
- Ciudad obligatoria en registro.
- Consentimientos separados y versionados.
- Flujo de revocacion y eliminacion.
- Atribucion de origen de registro y mapa de creador.

### Criterio de cierre

- No se puede crear cuenta sin consentimiento de funcionamiento.
- Evidencia legal auditable por version y fecha.

## Fase Cinco. Analitica minima del MVP (Prioridad Alta)

Objetivo: entregar valor inmediato a creadores y a operacion interna.

### Entregables

- Tablero de producto (conversion y retencion base).
- Tablero de creador (vistas internas, horas internas, votos, favoritos, ver mas tarde).
- Tablero de sponsor (cantidad de videos, ingresos y rendimiento basico).
- Tablero geografico (videos por pais, vistas por pais, interaccion por pais).
- Distincion visual entre metrica interna y metrica YouTube.

### Criterio de cierre

- Los cuatro tableros cargan con filtros por periodo y sin mezclar origen de datos.

## Fase Seis. Demo publica no persistente y canal real autorizado (Prioridad Alta)

Objetivo: vender el producto sin riesgo de datos ni confusion operativa.

### Entregables

- Modo demostracion en homepage y rutas de prueba.
- Estado efimero en demo: cambios no persistentes y reinicio a default.
- Indicador visible de modo demostracion.
- Canal real de `by.pupila` disponible en solo lectura publica.

### Criterio de cierre

- Ninguna interaccion de demo altera datos persistentes.
- Flujo de paso a registro real esta visible y funcional.

## Fase Siete. Operacion de salida (Prioridad Critica)

Objetivo: salida controlada con monitoreo y reversion.

### Entregables

- Alertas de severidad critica y alta.
- Lista de salida o bloqueo para release.
- Politica de migraciones con respaldo y rollback.
- Pagina publica minima de estado.

### Criterio de cierre

- Se cumple lista de salida o bloqueo sin excepciones criticas abiertas.

## Lista inmediata de desarrollo (Semana uno y semana dos)

### Semana uno

- Fase Cero completa.
- Inicio de Fase Uno.
- Inicio de Fase Cuatro.

### Semana dos

- Cierre de Fase Uno.
- Fase Dos completa.
- Fase Tres en progreso.

## Definition de Hecho para cerrar MVP

- Flujos criticos completos: registro, importacion, sponsors, votacion, analitica, demo.
- Permisos por rol validados.
- Cumplimiento legal y evidencias de consentimiento validadas.
- Monitoreo activo y plan de rollback probado.

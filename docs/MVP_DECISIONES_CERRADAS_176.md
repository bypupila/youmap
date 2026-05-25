# Decisiones Cerradas del Producto (Base Operativa)

Fecha de consolidacion: 2026-05-23

Este documento fija la base funcional acordada durante el ciclo de preguntas y respuestas.  
Su objetivo es cerrar alcance de producto para iniciar desarrollo de MVP sin reabrir decisiones ya tomadas.

## Uno. Alcance funcional del MVP

- La plataforma es una herramienta de YouTube orientada a historial, analitica y operacion para creadores de viajes.
- El foco principal no es contable ni financiero avanzado; el foco es analitica util y operacion de contenido/sponsors.
- Flujo obligatorio: primero existe el video en YouTube, luego se importa y opera en Travel Your Map.

## Dos. Modelo geografico

- En videos se elimina ciudad como dato operativo principal.
- En videos se mantiene pais como nivel geografico principal.
- En votaciones se mantiene pais y luego se habilita votacion de ciudades del pais ganador.
- El catalogo geografico global debe contener ciudades de todos los paises del mundo.
- Nombres de ciudades y paises en nombre completo (sin abreviaciones).

## Tres. Sponsors

- Estado de dato obligatorio por video:
  - Confirmado manualmente
  - Detectado automaticamente
  - Pendiente de revision manual
  - No disponible
- Termino oficial: `sponsor detectado` (no usar “posible sponsor”).
- Si no hay evidencia clara desde datos disponibles, no se asigna sponsor automatico.
- En ese caso queda manual para que el creador lo confirme.
- Soporte de uno o varios sponsors por video, con posibilidad de sponsor principal.
- Asignacion individual y asignacion masiva obligatorias en panel administrativo.

## Cuatro. Extraccion desde YouTube

- Solo usar datos disponibles desde la interfaz de programacion de aplicaciones de YouTube ya consultados en el flujo de importacion.
- No agregar llamadas extra costosas para deteccion de sponsor salvo que exista optimizacion comprobada.
- Si la deteccion automatica no es confiable, dejar estado en revision manual.
- Debe existir prueba real con lote pequeno para validar:
  - video con sponsor detectado correctamente
  - video sin sponsor sin falso positivo

## Cinco. Votaciones

- Votacion por pais activa en MVP.
- Al cerrar votacion de pais, se crea borrador de votacion de ciudades del pais ganador.
- Esta creacion debe ser idempotente y auditable.

## Seis. Demo y canal real

- Debe existir modo demostracion para homepage y evaluacion pre pago.
- El modo demostracion no persiste cambios de usuarios.
- El modo demostracion vuelve siempre al estado por defecto.
- Se permiten metricas anonimas agregadas de conversion en modo demostracion.
- Canal real permitido: `by.pupila` (con consentimiento del propietario).
- En modo real publico, visitantes solo lectura.

## Siete. Registro y roles

- Registro de viewer obligatorio.
- Registro de viewer gratuito.
- Registro de creador no libre: acceso como creador ocurre por flujo de pago (Polar).
- Ciudad obligatoria en registro de viewer.
- Atribucion de registro obligatoria: origen plataforma, mapa de creador, y parametros de campana.

## Ocho. Consentimientos y cumplimiento

- Consentimientos separados:
  - funcionamiento de cuenta (obligatorio)
  - promociones de Travel Your Map (opcional)
  - promociones de creadores (opcional)
- Guardar evidencia de consentimiento por version legal y fecha.
- Derechos del titular, eliminacion y trazabilidad obligatorios.
- Politica de menores y moderacion de contenido incluidas en alcance operativo.

## Nueve. Analitica

- Diferenciar siempre:
  - Horas reproducidas en Travel Your Map (interna)
  - Metricas provenientes de YouTube
- Mostrar origen de cada metrica en interfaz.
- Eventos y tableros minimos por producto, creador, sponsor y geografia.
- Retencion definida:
  - eventos crudos: 90 dias
  - agregados anonimos: 24 meses
  - evidencia de consentimiento: 5 anos

## Diez. Operacion y escalabilidad

- Monitoreo, alertas, niveles de incidente, matriz de comunicacion y pagina de estado publica minima.
- Controles anti abuso con umbrales, puntaje de riesgo y apelacion.
- Exportaciones con limites, asincronia y auditoria.
- Migraciones con respaldo previo y plan de reversion.

## Once. Restricciones legales y de marca para demos

- No usar creadores reales publicamente sin consentimiento formal.
- Avisos o disclaimers no eliminan riesgo legal por uso no autorizado.
- Para demostracion abierta, usar datos de demo y/o canales autorizados.

## Doce. Elementos diferidos intencionalmente

- Email marketing para creadores no disponible en MVP.
- Debe mostrarse como `Proximamente` con opcion `Avisarme cuando este listo`.

## Trece. Regla de control de alcance

- Todo requerimiento nuevo debe clasificarse en:
  - Dentro de MVP cerrado
  - Fuera de MVP y enviado a backlog post MVP

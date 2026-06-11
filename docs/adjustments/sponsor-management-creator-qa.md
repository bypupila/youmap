# Sponsor Management Creator QA

## Status
Done

## Problem
El creador necesita un flujo claro para agregar, editar y eliminar sponsors sin perder contexto ni depender de acciones separadas. La superficie actual permite crear, ordenar, pausar y asignar en masa, pero la edición no aparece como una acción directa aunque el backend ya la soporta. La lista de sponsors queda después de la asignación masiva, lo que hace que el sponsor recién creado se pierda visualmente.

## Desired Behavior
El creador debe poder revisar sponsors existentes, agregar uno nuevo, editar sus datos, ajustar alcance/asignaciones y pausar o eliminar con confirmación desde una interfaz consistente y responsive.

## Resolved Language
- Sponsor style: ver `CONTEXT.md`.
- Sponsor preview: ver `CONTEXT.md`.
- Multi sponsor: ver `CONTEXT.md`.
- Pausar sponsor: ver `CONTEXT.md`.

## Decisions
- Usar una cuenta QA creator real con canal asociado para pruebas end-to-end locales.
- Auditar primero el flujo existente antes de definir la nueva interacción.
- Tratar la acción actual `Quitar` como pausa/desactivación, no como borrado físico.

## Constraints
- El flujo debe validar desktop y mobile.
- No debe exponer credenciales, tokens ni datos sensibles en documentación o respuesta.
- Debe reutilizar endpoints y componentes existentes cuando sea posible.
- Debe cubrir creación, edición, pausa/eliminación, reordenamiento, asignación masiva y errores de contenido.

## QA Findings
- Login con cuenta QA creator local funciona y redirige a dashboard.
- El panel real de creator carga el canal QA asociado.
- La creación de sponsor persiste correctamente y el preview acompaña marca, cupón y CTA.
- No hay acción visible para editar un sponsor existente.
- La acción visible dice `Quitar`/`Eliminar`, pero el backend desactiva el sponsor (`active=false`).
- La tabla de asignación masiva aparece antes de la lista de sponsors; en canales con muchos videos empuja las cards y acciones hacia abajo.
- Preview de asignación masiva puede reportar `0 aplicables` y luego la asignación real actualizar videos.
- Después de deshacer una asignación masiva, la tabla queda con estado visual viejo hasta recargar.
- En mobile no se detectó overflow horizontal en la pestaña sponsors.

## Latest UI Refinements
- En el wizard, el mensaje de CTA quedó debajo del selector de estilo y la URL del sponsor se movió debajo del CTA, para seguir el orden visual solicitado.
- El preview del video ahora responde al hover de los videos del selector para comparar rápidamente el resultado sin cambiar la selección.
- En la tabla de bulk assign se agregó una marca visible cuando la API de YouTube detecta sponsor en el video, más controles para seleccionar todo o limpiar la selección filtrada.

## Verification
- TypeScript: `npx tsc --noEmit --incremental false`.
- Browser QA desktop: creación, edición, preview, pausa con confirmación, bulk preview, bulk assign y deshacer asignación.
- DB cleanup: no quedaron sponsors QA activos después de las pruebas.

## Open Questions
- Ninguna para esta iteración.

## PRD
`docs/prd/sponsor-management-creator-qa.md`

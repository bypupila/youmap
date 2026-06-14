# Admin Panel Creator Analytics UX

## Status
Done

## Problem
El panel actual del creador muestra datos utiles, pero no los convierte en una herramienta clara de productividad para un influencer de viajes. La informacion critica queda repartida entre resumen tecnico, actividad, sponsors y analytics; no prioriza decisiones como que videos corregir, que paises monetizar, que destinos empujar, que contenido genera interaccion en el mapa o que senales first-party aporta Travel Your Map frente a YouTube.

## Desired Behavior
El panel debe funcionar como centro de decision del creador: mostrar salud del mapa, oportunidades comerciales, rendimiento de contenido, comportamiento dentro del mapa, votaciones, sponsors y acciones prioritarias en una UI simple, responsive y accionable. Debe distinguir claramente datos de YouTube de datos propios de Travel Your Map.

## Resolved Language
- `Panel del creador`: workspace privado operacional del influencer para gestionar mapa, videos, votaciones, sponsors, audiencia y acciones prioritarias.
- `Metricas del mapa`: datos first-party capturados dentro de Travel Your Map, separados de metricas de YouTube.
- `Accion prioritaria`: recomendacion operacional unica basada en salud del mapa, tareas pendientes, audiencia, monetizacion o sync.

## Decisions
- Superficie principal detectada: panel del creador/influencer, no administracion global de superadmin.
- Hay un prototipo avanzado de admin del mapa que ya modela videos, paises, votaciones, sponsors, audiencia, actividad, alertas y acciones rapidas.
- El endpoint de analytics del canal ya combina datos de YouTube o derivados de YouTube con eventos internos del mapa.
- El nuevo panel reemplazara al `/creator-panel` actual como experiencia principal, usando el panel avanzado existente como base para evitar duplicar logica y reducir confusion del creador.
- La pestaña Sponsors del nuevo panel debe conservar la profundidad del sponsor tab anterior: wizard con preview, estilos, CTA, cupones, alcance por pais/video/global, lectura de clicks y oportunidades comerciales.
- La pestaña Sponsors también recupera la tabla operativa de videos con filtros, selección por página y asignación masiva para mantener la mecánica editorial previa.

## Constraints
- Mantener `robots: noindex` en paneles privados.
- Validar responsive porque el panel incluye tablas, modales, sidebar y controles densos.
- No duplicar logica: reutilizar modelos, APIs y componentes existentes cuando sea posible.
- La UX debe explicar el origen de metricas sin sobrecargar al creador.
- Deben salir metricas de uso del mapa, no solo metricas de YouTube.

## Open Questions
Ninguna bloqueante.

## PRD
[Admin Panel Creator Analytics UX PRD](../prd/admin-panel-creator-analytics-ux.md)

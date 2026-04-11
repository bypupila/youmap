# TravelMap Design System (Apple-inspired, shadcn-based)

## Objetivo

Mantener una interfaz consistente, minimalista y orientada al contenido, con el globo como protagonista y superficies flotantes ligeras.

## Principios de interfaz

1. Contenido primero, UI despues.
2. Jerarquia clara en 3 niveles: kicker, titulo, soporte.
3. Superficies translúcidas y bordes finos, no cajas pesadas.
4. Color como acento, no como ruido.
5. Movimiento corto y utilitario, no decorativo.
6. Consistencia de espaciado y radio en toda la plataforma.

## Tokens globales

Definidos en `src/app/globals.css`.

- Colores semanticos:
  - `--background`, `--foreground`
  - `--card`, `--popover`, `--primary`, `--secondary`, `--accent`
  - `--border`, `--input`, `--ring`
- Escala espacial:
  - `--tm-space-1` a `--tm-space-8`
- Radios:
  - `--tm-radius-sm`, `--tm-radius-md`, `--tm-radius-lg`, `--tm-radius-xl`
- Motion:
  - `--tm-duration-fast: 140ms`
  - `--tm-duration-base: 220ms`
  - `--tm-duration-slow: 320ms`
  - `--tm-ease-standard: cubic-bezier(0.22, 0.61, 0.36, 1)`
- Materiales:
  - `--tm-glass`
  - `--tm-glass-strong`

## Utilidades visuales

- `.tm-surface`: panel translúcido estándar.
- `.tm-surface-strong`: panel principal.
- `.tm-hairline`: borde fino consistente.
- `.tm-kicker`: micro etiqueta superior.
- `.tm-title-display`: titulación principal.
- `.tm-safe-bottom`: padding safe-area mobile.

## Componentes de sistema

### `FloatingTopBar`
Archivo: `src/components/design-system/chrome.tsx`

Uso:
- encabezado flotante en landing, onboarding, dashboard, explore, pricing, mapa y perfil publico.
- evita headers custom por página.

### `MetricPill`
Archivo: `src/components/design-system/chrome.tsx`

Uso:
- KPIs cortos (`videos`, `paises`, `views`).

### `SignalPill`
Archivo: `src/components/design-system/chrome.tsx`

Uso:
- mensajes compactos de estado/intención (`SEO`, `extraccion diaria`, etc.).

## Reglas de composición

1. Cada pantalla usa una sola capa de contenido principal sobre el globo.
2. No duplicar paneles laterales para la misma función.
3. En mobile, paneles largos pasan a `Sheet`.
4. Confirmaciones y revisión manual usan `Dialog`.
5. Inputs siempre con `Input` de `shadcn`.
6. Listados scrolleables con `ScrollArea`.

## Reglas de accesibilidad

1. Todos los `Dialog/Sheet` incluyen `Title`.
2. Contraste sobre fondos translúcidos con tokens semanticos.
3. Targets interactivos minimos: alto >= `h-7`.
4. Focus ring estándar por `--ring`.

## Mapa operativo

`MapExperience` centraliza:

- leyenda por pais (desktop y mobile)
- filtros temporales (`30/90/365/todos`)
- refresh incremental
- popup de resumen de corrida
- cola de verificacion manual
- card activa de video

## Implementacion shadcn

Inicializado con `radix` y componentes fuente en `src/components/ui/*`.

Componentes instalados clave:

- `button`, `badge`, `card`, `input`, `separator`
- `dialog`, `sheet`, `tabs`, `tooltip`, `popover`
- `skeleton`, `scroll-area`

## Checklist para nuevas pantallas

1. Usar `FloatingTopBar` (no header ad-hoc).
2. Usar `SignalPill/MetricPill` para micro información.
3. No usar colores hardcodeados para estados principales.
4. Respetar radios de sistema (`--tm-radius-*`).
5. Mantener texto corto: una idea por bloque.

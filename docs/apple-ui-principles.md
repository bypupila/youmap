# Apple UI Principles translated to TravelMap

Este documento transforma principios de Apple a reglas ejecutables en nuestra plataforma web.

## Fuentes consultadas

- App design and UI overview: https://developer.apple.com/documentation/technologyoverviews/app-design-and-ui
- WWDC25 "Get to know the new design system": https://developer.apple.com/videos/play/wwdc2025/356/
- Typography HIG: https://developer.apple.com/design/human-interface-guidelines/typography
- WWDC20 "Make your app visually accessible": https://developer.apple.com/videos/play/wwdc2020/10020/
- WWDC25 "Principles of inclusive app design": https://developer.apple.com/videos/play/wwdc2025/316/

## Reglas extraídas

1. Diseñar con detalle sistémico.
- Apple enfatiza que los "smallest details" impactan la calidad total.
- Regla TravelMap: eliminar estilos ad-hoc por pantalla y centralizar en componentes/tokens.

2. Lenguaje visual cohesivo, adaptivo y expresivo.
- Apple describe la nueva base como "cohesive, adaptive and expressive".
- Regla TravelMap: una sola semántica de superficies (`tm-surface`, `tm-surface-strong`) y jerarquía textual común.

3. Estructura y continuidad como pilares.
- Apple separa explícitamente diseño en "Design Language", "Structure" y "Continuity".
- Regla TravelMap: `FloatingTopBar` + `MapExperience` como patrón estable entre landing, onboarding, dashboard, explore, map y perfil.

4. Tipografía para jerarquía y legibilidad.
- Apple HIG: la tipografía transmite jerarquía; Dynamic Type mejora legibilidad/confort.
- Regla TravelMap: escala tipográfica fija por nivel (`tm-kicker`, `tm-title-display`, cuerpo) y componentes que no dependen de tamaños arbitrarios.

5. Interfaces visualmente accesibles.
- Apple recomienda color pensado, texto legible y UI adaptable a tamaños de contenido/dispositivo.
- Regla TravelMap: tokens semánticos, contraste en overlays, y migración de paneles largos a `Sheet` en mobile.

6. Inclusión: múltiples modos de interacción y personalización.
- Apple recomienda soporte multisensorial, personalización y APIs de accesibilidad.
- Regla TravelMap: `Dialog`/`Sheet` con títulos accesibles, controles consistentes y foco visible por token `--ring`.

## Parámetros implementados

## Motion

- `--tm-duration-fast: 140ms`
- `--tm-duration-base: 220ms`
- `--tm-duration-slow: 320ms`
- `--tm-ease-standard: cubic-bezier(0.22, 0.61, 0.36, 1)`

## Espaciado

- `--tm-space-1` a `--tm-space-8` en escala 4pt/8pt.

## Radio

- `--tm-radius-sm: 0.75rem`
- `--tm-radius-md: 1rem`
- `--tm-radius-lg: 1.25rem`
- `--tm-radius-xl: 1.75rem`

## Materiales

- `--tm-glass`
- `--tm-glass-strong`
- utilidades: `.tm-surface`, `.tm-surface-strong`, `.tm-hairline`

## Tipografía

- base: `Space Grotesk` + `Inter` + fallback `-apple-system` / `SF Pro Text`.
- utilidades: `.tm-kicker`, `.tm-title-display`.

## Resultado esperado

- Menos ruido visual.
- Mayor consistencia cross-page.
- Mejor mantenibilidad por diseño tokenizado.
- Mejor accesibilidad en overlays y flujos de revisión.

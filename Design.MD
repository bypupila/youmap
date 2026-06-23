# Design.MD - TravelYourMap

Fecha: 2026-06-15

Este es el unico archivo de autoridad para diseno, marca, compliance visual, UX, accesibilidad y QA de TravelYourMap.
No debe existir otro `.md` con reglas de diseno activas. Si aparece una nueva necesidad visual, se actualiza este archivo.

## 1. Propósito

TravelYourMap debe sentirse como una herramienta propia para creadores de viaje: mapa, rutas, comunidad, sponsors y analitica.
Puede integrarse con YouTube, pero no debe parecer un producto oficial, afiliado o derivado visualmente de YouTube.

La experiencia debe priorizar:

- mapa y globo como senal visual principal
- contenido real por encima de decoracion
- claridad operativa antes que marketing
- consistencia de marca en todas las pantallas
- accesibilidad y responsive como requisitos, no como extras

## 2. Jerarquía documental

- `Design.MD`: contrato unico de marca, sistema visual y compliance.
- `src/app/globals.css`: implementacion real de tokens, superficies, colores y motion base.
- `src/components/design-system/chrome.tsx`: chrome compartido de navegacion y pills.
- `src/components/map/map-experience.tsx`: shell principal del mapa y workspace.

No crear nuevos documentos paralelos para "guia de diseño", "principios UI" o "sistema visual".
Si alguna regla cambia, esta fuente se actualiza primero.

## 3. Marca y compliance

- Nombre canonico: `TravelYourMap`.
- Firma de producto: `TravelYourMap - BY PUPILA`.
- Categoria: mapas interactivos para creadores de viaje.
- Promesa: convertir un canal de viajes en una experiencia geografica publicable.
- Tono: editorial, premium, tecnico y directo.

No usar como marca propia:

- variantes que mezclen `You` + `Map`
- `TravelMap`
- `MapTuber`
- cualquier nombre que sugiera afiliacion con YouTube o Google

## Uso permitido de YouTube

YouTube puede aparecer solo de forma referencial o descriptiva:

- `Conectado a YouTube`
- `Abrir en YouTube`
- `compatible con YouTube`
- `usa YouTube API Services`
- links a terminos, privacidad o player oficial

Siempre que se hable de integracion, debe quedar claro que YouTube es un tercero.

Disclaimer obligatorio en superficies legales, auth y alta confianza:

> TravelYourMap no esta afiliado, patrocinado ni respaldado por YouTube ni por Google.

## Uso prohibido o de alto riesgo

No usar:

- logo de YouTube como icono de navegacion, badge de marca, favicon, sidebar item o CTA propio
- claims como `UI nativa de YouTube`, `tipo YouTube Studio`, `inspirado en YouTube`
- botones rojos con logo de YouTube dentro de la UI propia
- paleta rojo puro + negro como identidad dominante
- lenguaje que sugiera producto oficial, partnership o respaldo

El logo de YouTube solo puede aparecer si lo renderiza el reproductor oficial embebido o una superficie externa controlada por YouTube.

## 4. Atmosfera visual

La interfaz debe ser dark premium, editorial y centrada en mapa.

- base oscura, pero no pura negra
- acento coral/naranja-rojo propio
- glass y blur controlados
- bordes finos y sombras profundas
- densidad media-alta para dashboard y mapa
- composicion asimetrica, no genérica

No usar estetica de "YouTube Studio", no usar rojo puro como identidad dominante y no construir pantallas que parezcan un editor de video.

## 5. Sistema visual

### Tokens reales del proyecto

Definidos hoy en `src/app/globals.css`:

- `--travel-base-bg: #111416`
- `--travel-base-elevated: #171b1e`
- `--travel-base-soft: #1d2327`
- `--travel-text-primary: #f3eee7`
- `--travel-text-secondary: #b7b0a6`
- `--travel-text-disabled: #78736b`
- `--travel-accent: #ff5a3d`
- `--travel-accent-strong: #d8462f`
- `--travel-accent-soft: rgba(255, 90, 61, 0.16)`
- `--travel-border: rgba(255, 245, 235, 0.1)`
- `--travel-border-strong: rgba(255, 245, 235, 0.16)`
- `--travel-chip-bg: rgba(255, 255, 255, 0.05)`

Tokens semanticos de la capa shadcn/Tailwind:

- `--background`, `--foreground`
- `--card`, `--popover`, `--primary`, `--secondary`, `--accent`
- `--border`, `--input`, `--ring`
- `--radius: 1.5rem`

Tipografia activa del sitio:

- sans: `Outfit`
- mono: `JetBrains Mono`

### Sistema semantico de interfaz

La guia de implementacion usa estas semanticas compartidas:

- `tm-surface`: panel translucido estandar
- `tm-surface-strong`: panel principal
- `tm-hairline`: borde fino consistente
- `tm-kicker`: micro etiqueta superior
- `tm-title-display`: titulacion principal
- `tm-safe-bottom`: padding seguro para mobile

La escala semantica de uso debe conservar:

- `--tm-space-1` a `--tm-space-8`
- `--tm-radius-sm`, `--tm-radius-md`, `--tm-radius-lg`, `--tm-radius-xl`
- `--tm-duration-fast: 140ms`
- `--tm-duration-base: 220ms`
- `--tm-duration-slow: 320ms`
- `--tm-ease-standard: cubic-bezier(0.22, 0.61, 0.36, 1)`
- `--tm-glass`
- `--tm-glass-strong`

Aunque algunas de estas semanticas vivan como contrato y no como variable literal, el sistema debe respetarlas como vocabulario estable.

### Iconografia

Usar iconos genericos para la integracion:

- `Video`
- `MapPin`
- `Globe`
- `ArrowSquareOut`
- `LinkSimple`

No usar `YoutubeLogo` en sidebar, header, menu mobile, botones primarios, favicon ni badges internos.

## 6. Tipografía

- Usar `Outfit` para headlines, labels, body y navegación.
- Usar `JetBrains Mono` para metrics, ids, timestamps, codigos de pais y datos compactos.
- La jerarquia debe ser por peso, color y escala, no por exceso de tamaños.
- En pantallas densas, los numeros y metadatos deben apoyarse en mono.
- La escala visual debe ser fija por nivel: kicker, titulo, soporte.
- El texto editorial debe mantenerse corto y con buen aire.

Reglas:

- no usar Inter
- no usar system fonts como estilo principal de producto
- no usar serif generica
- no escalar tipografia por `vw`
- no comprimir tracking negativamente

## 7. Componentes

### Chrome compartido

- `FloatingTopBar` es el encabezado estandar para landing, onboarding, dashboard, explore, mapa y perfil publico.
- `MetricPill` se usa para KPIs cortos.
- `SignalPill` se usa para mensajes compactos de estado o intencion.

### Superficies

- `tm-surface` para paneles secundarios.
- `tm-surface-strong` para paneles principales y dialogos.
- No anidar cards dentro de cards salvo que exista una jerarquia real.
- No convertir secciones completas en cajas pesadas si el layout puede funcionar con aire y separadores.
- Las sombras deben ser profundas pero oscuras, nunca neón.

### Botones

- Primario: fill coral, texto claro, presencia firme.
- Secundario: fondo translucido, borde fino, sin ruido visual.
- Targets tactiles minimos: 44px.
- Feedback activo: ligero desplazamiento y cambio de intensidad.
- No usar glow exterior llamativo.

### Inputs y formularios

- Label arriba del input.
- Helper text opcional debajo.
- Error debajo y en lenguaje claro.
- Evitar floating labels.
- Inputs con focus ring consistente por `--ring`.

### Loading y vacios

- Preferir skeletons que respeten la geometria real.
- Evitar spinners genericos cuando la interfaz ya tiene estructura.
- Los empty states deben sugerir la proxima accion, no solo decir "sin datos".

### Dialog y Sheet

- Usar `Dialog` para confirmaciones, revisiones y detalles que no deben romper el flujo.
- Usar `Sheet` para paneles largos en mobile.
- Todo `Dialog` y `Sheet` debe incluir `Title`.

## 8. Layout

- El globo/mapa es la señal visual principal.
- La composicion debe decir "mundo, rutas y destinos", no "estudio de video".
- Landing, onboarding, auth, dashboard, explore, `/map` y `/u/[username]` deben compartir lenguaje de sistema.
- Desktop: header, contenido principal y rails con prioridad clara.
- Mobile: una sola columna principal y paneles secundarios apilados o en `Sheet`.
- Evitar overflow horizontal.
- Evitar layouts de `3` cards iguales como patrón por defecto.
- Si un rail o panel compite con el mapa, el mapa gana.

Reglas de composicion:

- una sola capa principal de contenido sobre el globo
- controles secundarios en rail, drawer o dialogo
- max-width para chrome cuando haga falta, pero el mapa puede ir full-bleed
- secciones largas deben sostenerse con separadores y ritmo, no con cajas repetidas

## 9. Motion

- Movimiento corto, utilitario y suave.
- Animar solo `transform` y `opacity` siempre que sea posible.
- No animar `top`, `left`, `width` o `height`.
- Las transiciones base deben sentirse firmes, no elásticas de mas.
- Usar loops discretos para estado activo: pulse, shimmer, float.
- El movimiento nunca debe competir con lectura o mapa.

Efectos base ya presentes en el sistema:

- `platform-pulse`
- `platform-shimmer`
- `platform-float`

## 10. Responsive y accesibilidad

Reglas base:

- mobile first
- sin overflow horizontal
- 320px, 390px, 768px, 1024px y 1440px son viewport de prueba obligatorios
- targets tactiles minimos de 44px
- contraste suficiente sobre glass y overlays
- foco visible en toda interaccion

Accesibilidad:

- todos los `Dialog` y `Sheet` incluyen `Title`
- no usar color como unico canal para estado
- texto no debe cortarse ni superponerse
- menus, filtros y paneles deben seguir siendo navegables en mobile
- safe area inferior respetada en vistas mobile

## 11. Copy, SEO y contenido

Usar:

- `mapa interactivo`
- `rutas`
- `destinos`
- `creadores de viaje`
- `canal conectado`
- `sponsors por destino`
- `votacion de audiencia`
- `panel admin`
- `reproductor oficial de YouTube`

Evitar:

- `YouTube Studio`
- `UI nativa de YouTube`
- `inspirado en YouTube`
- `for YouTube Creators` como marca principal
- claims de afiliacion, respaldo o partnership
- filler copy como `Scroll to explore`, `Swipe down` o flechas decorativas

Reglas de SEO visual y contenido:

- metadata consistente en pantallas publicas
- titulos claros y humanos
- descripciones utiles, no vacias
- no usar nombres genericos de placeholder
- mantener textos breves y utiles para escaneo

## 12. Compatibilidad de rename

El producto debe usar `travelyourmap_*` para nuevos datos locales, pero leer temporalmente claves legacy:

- `travelmap_session`
- `travelmap_voter`
- `travelmap_seen_videos_v1`
- `travelmap_opened_videos_v1`
- `travelmap_saved_videos_v1`
- `travelmap_featured_videos_v1`
- `travelmap-import-run-id:*`

La migracion no debe cortar sesiones, votos, actividad local ni runs de onboarding existentes.

## 13. QA visual y de contenido

Antes de publicar cambios de marca o UI, ejecutar:

```bash
rg "Design\\.MD|design-system\\.md|apple-ui-principles\\.md" src docs README.md
rg "TravelMap|MapTuber|YouTube Studio|inspirada en YouTube|for YouTube Creators" src docs README.md Design.MD
rg "YoutubeLogo" src
rg "#ff0000|#cc0000|rgba\\(255,\\s*0,\\s*0|bg-red-500|text-red-|border-red-" src docs Design.MD
npm run lint
npm run build
```

Validar en navegador:

- landing
- onboarding
- auth
- dashboard/map
- `/map`
- `/explore`
- `/u/[username]`
- terms/privacy

Viewports minimos:

- 320px
- 390px
- 768px
- 1024px
- 1440px

Criterios de aceptacion:

- No hay logo de YouTube fuera del player oficial.
- El nombre visible del producto es `TravelYourMap`.
- Los CTA a YouTube son referenciales y usan icono generico de salida.
- No hay claims de afiliacion, respaldo o UI oficial.
- No hay textos cortados ni overlap en mobile.
- La experiencia se siente centrada en mapa/viaje, no en una copia de YouTube Studio.
- No queda ningun otro archivo de diseño con autoridad propia.

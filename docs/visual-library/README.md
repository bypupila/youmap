# TravelYourMap Visual Library

Biblioteca local para revisar la plataforma visualmente sin depender de memoria ni de propuestas sueltas.

## Estructura

- `versions/<fecha>/pages/`: capturas full-page por ruta.
- `versions/<fecha>/components/`: crops de componentes renderizados con `data-component`.
- `versions/<fecha>/responsive/`: capturas de estados responsive relevantes.
- `versions/<fecha>/ui-issues/`: capturas que fallaron validaciones visuales y requieren corrección antes de usarse como referencia.
- `versions/<fecha>/manifest.json`: inventario de paginas, componentes detectados en `src` y capturas generadas.
- `versions/<fecha>/index.html`: galeria local navegable.
- `LATEST.md`: puntero a la version mas reciente.

## Generar una nueva version

1. Levanta la app local.

```bash
npm run dev
```

2. En otra terminal, genera la biblioteca.

```bash
npm run visual:capture
```

Variables opcionales:

```bash
VISUAL_LIBRARY_BASE_URL=http://localhost:3000 VISUAL_LIBRARY_VERSION=2026-05-21 npm run visual:capture
```

## Criterio

Los nombres visuales salen de `data-component` cuando existe. El inventario de `manifest.json` tambien lista los nombres reales detectados en archivos `.tsx`, para cruzar pagina, componente y archivo fuente.

Las rutas con mapa no se guardan como referencia si el canvas WebGL sigue negro, si no hay markers o si el sidebar/rail no tienen contenido. En ese caso la captura se manda a `ui-issues/`.

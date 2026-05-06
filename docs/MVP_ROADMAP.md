# Roadmap MVP - TravelYourMap

Auditoria realizada el 2026-04-23 sobre el repo local y las rutas principales.

## Estado actual

TravelYourMap ya tiene la base de MVP: landing, onboarding, auth, dashboard/mapa, perfil publico, explore, billing Polar, importacion YouTube, Neon y sponsors. El producto compila y el contrato de entorno local pasa validacion.

Validaciones ejecutadas:

- `npm run lint`: verde.
- `npm run build`: verde.
- `npm run validate:env`: verde.
- Smoke visual con Chromium headless en desktop y mobile para `/`, `/onboarding`, `/map`, `/explore` y `/auth`.
- Smoke HTTP local: `/`, `/map`, `/explore` y `/u/demo` responden `200`.

## Lectura MVP

El producto esta cerca de un MVP lanzable, pero todavia mezcla tres capas que deben separarse antes de publicar:

- Producto real para creadores.
- Demo publica para venta y validacion.
- Herramientas internas de QA.

La prioridad no es agregar mas features. La prioridad es hacer que lo existente sea confiable, claro y vendible.

## Bloqueadores de lanzamiento

### P0. Ocultar QA interno en produccion

Problema: el onboarding muestra `Procesar sin pago (TEST)` por defecto cuando `NEXT_PUBLIC_ENABLE_TEST_NO_PAYMENT` no es `"0"`.

Impacto: un usuario real puede saltar checkout y crear trial manual. Para launch debe ser opt-in, no opt-out.

Accion:

- Cambiar el default a oculto.
- Mostrarlo solo con `NEXT_PUBLIC_ENABLE_TEST_NO_PAYMENT=1`.
- Mantener el flujo de QA documentado para staging/local.

Criterio de aceptacion:

- En produccion no aparece ningun CTA con `TEST`.
- En local/staging puede activarse explicitamente.

### P0. Cerrar rutas de ejemplo Sentry

Problema: existen `/sentry-example-page` y `/api/sentry-example-api` en el arbol de rutas.

Impacto: ruido publico, superficie innecesaria y senal de producto no terminado.

Accion:

- Eliminar las rutas o protegerlas por entorno.
- Validar que Sentry siga inicializando desde `instrumentation-client.ts`.

Criterio de aceptacion:

- Las rutas demo no estan publicas en produccion.
- Build sigue verde.

### P0. Confirmar checkout real de Polar con datos activos

Problema: el build pasa, pero el MVP depende de que `subscription_plans.polar_price_id`, `POLAR_ACCESS_TOKEN` y `POLAR_WEBHOOK_SECRET` esten correctos en produccion.

Impacto: si el checkout cae en `plan_unavailable`, el onboarding se rompe justo en conversion.

Accion:

- Verificar planes activos en Neon.
- Validar redirect real de `/api/billing/polar/checkout?plan=pro&lang=es`.
- Validar webhook con un evento real o replay.

Criterio de aceptacion:

- `creator` y `creator_pro` abren Polar.
- Webhook crea/actualiza `subscriptions` con `active` o `trialing`.
- Dashboard deja pasar a usuarios con suscripcion valida.

## Problemas de UX y diseno detectados

### P1. Onboarding mobile se siente apretado y con contenido tapado

Evidencia: en 390x844, la barra superior y el stepper ocupan demasiado alto; el texto superior queda cortado y el footer fijo tapa parte del contenido.

Accion:

- Convertir el stepper mobile en tabs compactos con scroll interno y sombra clara.
- Aumentar el `padding-top` real del contenido o hacer header sticky dentro del flujo.
- Reservar espacio inferior para el footer fijo.
- Reducir tarjetas del paso 0 en mobile o usar layout vertical mas denso.

Criterio de aceptacion:

- Ningun titulo queda cortado en 390x844.
- El boton `Continuar` no tapa texto ni cards.
- El usuario entiende en que paso esta sin desplazar horizontalmente toda la pagina.

### P1. `/map` muestra `Demo fallback` aun cuando es el demo esperado

Problema: `/map` carga el demo por defecto, pero el header dice `Demo fallback`.

Impacto: comunica error o degradacion aunque sea una ruta valida.

Accion:

- Ajustar `headerEyebrow` para distinguir `Demo map`, `Public map` y fallback real.

Criterio de aceptacion:

- `/map` default muestra `Demo map`.
- Solo se muestra fallback cuando un `channelId` solicitado falla y se degrada al demo.

### P1. Explore esta demasiado incompleto para superficie publica

Problemas:

- Usa solo `DEMO_VIDEO_LOCATIONS.slice(0, 9)`.
- Varias tarjetas muestran `No thumbnail`.
- Los filtros son decorativos.
- Los links usan `/map?country=...`, pero `/map` no consume `country`.

Impacto: parece una pagina placeholder y reduce confianza SEO/comercial.

Accion:

- Alimentar Explore con datasets locales reales de Luisito + Drew o con payload publico agregado.
- Agregar thumbnails reales o fallback visual editorial con pais/titulo.
- Hacer que los filtros funcionen o quitarlos para MVP.
- Implementar deep link `country` en `/map` o cambiar links a rutas que si existan.

Criterio de aceptacion:

- No hay cards con `No thumbnail` en el primer viewport.
- Click en pais/video lleva a una experiencia coherente.
- Filtros visibles modifican resultados o no se muestran.

### P1. Copy mixto ES/EN en superficies criticas

Problema: la landing esta en ES, pero mapa/explore mantienen textos ingleses como `Search videos, countries, cities`, `Navigation`, `Creator map`, `Owner map`.

Impacto: inconsistencia de marca y friccion para lanzamiento hispano.

Accion:

- Definir idioma principal de MVP: ES por defecto.
- Pasar strings compartidos de `MapExperience`, `Explore` y `Auth` por diccionario simple.
- Mantener `lang=en` como variante si se decide vender bilingue.

Criterio de aceptacion:

- Una sesion `lang=es` no mezcla labels ingleses en UI principal.
- Landing, onboarding, mapa y auth comparten tono.

### P1. Perfil publico sin metadata dinamica

Problema: `/u/[username]` no define `generateMetadata`.

Impacto: el mapa publico es una superficie SEO clave, pero no produce title/description por creador.

Accion:

- Agregar metadata dinamica con nombre del canal, handle y descripcion.
- Agregar canonical estable.
- Evaluar JSON-LD basico de creator/profile.

Criterio de aceptacion:

- `/u/demo` tiene title y description propios.
- Cada creador indexable expone metadata no generica.

## Mejoras de flujo del usuario

### Onboarding

Objetivo MVP: el usuario entiende el valor, valida canal, elige plan, paga o entra al procesamiento sin perder contexto.

Acciones:

- Dejar `Validar canal` como paso obligatorio antes de avanzar.
- Mostrar metricas reales de validacion sin prometer paises hasta terminar importacion.
- Reducir pasos si el flujo se siente largo: Resumen -> Canal -> Plan -> Procesamiento.
- Mover sponsors, analytics y fan vote a preview lateral o seccion compacta, no como pasos obligatorios.

### Dashboard / mapa owner

Objetivo MVP: despues de pagar/importar, el creador ve su mapa, errores manuales y link publico.

Acciones:

- Mantener `Missing videos` solo para owners.
- Clarificar estados `Refresh`, `Manual`, `Sponsors` con labels en ES.
- Agregar estado vacio de importacion cuando aun no hay pins pero si hay canal.

### Public map

Objetivo MVP: una URL publica debe vender el producto sola.

Acciones:

- Header claro con creador, share y CTA si el viewer no es owner.
- Sponsor rail solo con sponsors reales o ejemplos marcados como demo.
- Fan vote usable sin abrir friccion innecesaria.

### Auth

Objetivo MVP: login simple, sin distraer.

Acciones:

- En mobile, poner primero el form y reducir el bloque editorial inferior.
- Agregar CTA visible a onboarding arriba del fold.
- Evitar copy largo debajo del form.

## Roadmap recomendado

### Semana 1. Cierre de lanzamiento

1. Ocultar QA interno por defecto.
2. Quitar/proteger rutas Sentry example.
3. Arreglar `Demo fallback` en `/map`.
4. Corregir layout mobile del onboarding.
5. Revisar copy ES en landing, onboarding, mapa y auth.
6. Smoke test checkout Polar real.

Resultado esperado: se puede compartir la app sin senales obvias de entorno interno.

### Semana 2. Producto publico y SEO

1. Metadata dinamica en `/u/[username]`.
2. Sitemap y robots si no existen.
3. Explore con datos reales, filtros funcionales o superficie reducida.
4. Deep links de pais/video hacia mapa.
5. Fallbacks visuales para thumbnails ausentes.

Resultado esperado: el producto empieza a ser indexable y presentable fuera del demo.

### Semana 3. Activacion y confiabilidad

1. Simplificar pasos de onboarding si la conversion cae.
2. Validar importacion completa con un canal real.
3. Estados de error y reintento para procesamiento.
4. Tests de integracion ligeros para auth -> onboarding -> processing -> dashboard.
5. Checklist de release con smoke browser desktop/mobile.

Resultado esperado: un creador puede activar sin ayuda manual.

### Semana 4. Monetizacion MVP

1. Sponsors reales en dashboard owner.
2. Tracking de clicks visible en analytics.
3. Limites por plan aplicados en UI y backend.
4. Copy de pricing dentro del onboarding alineado con Polar.
5. Primer flujo de ventas: demo publica -> onboarding -> checkout.

Resultado esperado: MVP vendible con monetizacion nativa.

## Definition of Done MVP

El MVP queda listo para lanzar cuando:

- Un usuario nuevo puede validar canal, registrarse, pagar o entrar a trial valido y llegar a procesamiento.
- La importacion muestra progreso real y no simulado.
- El dashboard carga el mapa o un estado accionable.
- El mapa publico tiene URL estable, metadata propia y no muestra herramientas owner a visitantes.
- No hay CTAs de QA, rutas example ni placeholders visibles en rutas publicas.
- Build, lint, env validation y smoke responsive pasan antes de deploy.

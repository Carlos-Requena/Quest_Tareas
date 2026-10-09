# Historial de verificación · Mercader: el escaparate de Hu Tao

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/merchant/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## 2026-10-09 · Artefactos visuales: nombres y diálogo

Hecho con `pnpm dev` en el navegador integrado, con una partida de pruebas con títulos largos (quests, encargos y bloques de agenda), a 1.024 × 768 (la ventana mínima), 1.512 × 945 y 402 × 874, en español y japonés. Un detector en la consola buscaba textos que se salen, se cortan o parten en dos líneas dentro de un botón, y cajas más anchas que su contenedor. `tsc`, `pnpm test`, `pnpm build` y `pnpm docs:check`, en verde.

- **Problema:** los nombres largos de la lista se cortaban a media letra bajo el precio, sin «…» (el «…» estaba en una caja flex, donde no se aplica); en el teléfono, la flecha ▼ de Hu Tao pisaba la última palabra.
- **Comprobado:** «Guanteletes del Estilo del Dios del Norte» acaba en «…» a 1.024 y 402 px; la flecha, debajo del texto.

**No verificado:** la app nativa.

## Registro hasta el 2026-10-07

Hecho el 2026-10-02:

- **Tests** (`pnpm test`): `model.test.ts` (precios y rangos, semanas con los cambios de hora de 2026, escaparate determinista y justo en 26 semanas, recién llegadas, `nextShowing`, guardas de la proyección) y `actions.test.ts` con el store de verdad (happy-dom): comprar con cada bloqueo, el escaparate de la semana, crear sin precio, editar por campos, retirar una pieza puesta. En `domain/projection.test.ts`: el oro solo baja al comprar, y justo el precio; doble gasto entre dos dispositivos en cualquier orden; invariantes sobre 40 historiales aleatorios con compras.
- **Prueba de mutación**: 11 errores introducidos a mano en el mercader, el equipo y los atributos (quitar la guarda del oro, permitir recomprar, escaparate sin límite, sin rango, etc.); los tests detectan los 11.
- **Navegador** (`pnpm dev`, Chromium de Playwright, 1280 × 780): añadir cinco piezas con imagen (SVG y JPG) desde el formulario, la imagen grande del fondo en IndexedDB, el escaparate con NEW, la ficha con «Te faltan…» y «Rango A», la compra armada en rojo, el sello SOLD con monedas sobre el vídeo, el oro de 60.000 a 52.000 G, el catálogo con «Es tuyo», el fantasma del vídeo y la ventana en japonés. El pie y la cabecera caben de 1.024 a 1.440 px.
- **Datos antiguos**: un historial sin eventos del mercader y un snapshot de la versión 1 (sin los acumuladores nuevos): se descarta, se recalcula y la app arranca sin errores.

**No verificado:** la app nativa (`pnpm tauri dev`): ni el vídeo MP4 en el WKWebView de macOS (en las pruebas se reprodujo el WebM), ni la imagen grande del fondo en la tabla `blobs` de SQLite. Tampoco Windows ni los sonidos (no se han escuchado: sello, monedas, fanfarria).

### El vídeo quieto en macOS (2026-10-02)

El propietario vio a Hu Tao **quieta** en su equipo. Causas posibles, y lo que se hizo con cada una:

1. **«Reducir movimiento» activado en macOS**: el vídeo no se ponía en marcha a propósito. Ahora se mueve siempre: es un bucle suave, sin desplazamientos, y quieta parecía un fallo.
2. **El WebView de macOS pide los vídeos por trozos** (cabecera `Range`) y el protocolo con el que Tauri sirve la app empaquetada no siempre los atiende: el vídeo se queda en el póster. Ahora el vídeo se descarga entero y se reproduce desde memoria (`blob:`), una vez por sesión (`videoUrl` en `HuTaoStage.tsx`): MP4 si el WebView sabe leer H.264 (`canPlayType`) y, si no, WebM.
3. **Autoplay**: WebKit solo deja arrancar solo un vídeo **mudo**, y React no pone el atributo `muted` en el HTML. Ahora se marca mudo (propiedad y atributo) antes de darle la fuente, se llama a `play()` cuando puede reproducirse y, si aun así no arranca, con el primer clic en la ventana.

Verificado en el navegador (Chromium, WebM): el vídeo se carga como `blob:`, va mudo y avanza (2,1 s → 3,6 s en 1,5 s). **Sin verificar en la app nativa de macOS**: hay que comprobarlo allí.

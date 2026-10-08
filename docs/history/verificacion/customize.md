# Historial de verificación · Personalización

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/customize/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## 2026-10-08 · Pestañas del personaje: Menú, Mi día y Movimiento

En el navegador del panel (Chromium) con datos de prueba, que se dejaron como estaban al terminar.

- **1.280 × 800 (japonés):** elegir a Aqua abre sus tres pestañas; en Movimiento, la vista previa viva; viento intenso y entrada gacha (con «Ver la entrada»); en Mi día, las siete situaciones. Los nombres de las situaciones en japonés no cabían y el botón del compañero se salía de su columna: se acortaron y el botón parte su texto.
- **1.024 × 700 (español):** las filas de Movimiento se pisaban con su texto: el control pasa a medir lo suyo y la vista previa, a ser algo más estrecha.
- **402 × 874 (español):** el pie de Movimiento se montaba sobre las filas (la columna que se desplaza encogía cada bloque): arreglado; en Mi día, elegir a Aqua y escribirle una frase; en la rejilla, las etiquetas «De serie» y «Compañero» se cortaban: pasan a una segunda línea.
- **No se verificó:** el selector de archivos del iPhone con vídeos, la app nativa y la llegada a otro equipo por Drive.

## 2026-10-08 · Primera versión: personajes con sus frases e ilustraciones de encargos

Con `pnpm dev` en el navegador del panel (Chromium), con datos de prueba y no los del propietario.

- **Tipos, tests y build:** `npx tsc --noEmit`, `pnpm test` y `pnpm build` correctos. Tests nuevos de las frases (añadir, editar, quitar, repetidas, vacías, de una parte del día desconocida, de un personaje quitado, que se van con él, sin límite y la elegida al azar) y de las ilustraciones del jugador (repetidas, quitadas, de un tipo desconocido, sin imagen, por tipo y en orden, binarios en uso y en el estado). Los dos tipos de evento entran en `randomStream`, así que los invariantes de la proyección y del snapshot los recorren.
- **Escritorio (1.280 × 800, español):** la tarjeta Customize en la fila de abajo del menú, sin salirse; la ventana con la pestaña Cast, cinco personajes de serie y siete huecos «+»; Kazuma: dos frases de mañana con `Enter`, la segunda editada en el sitio y la primera quitada con dos toques; los eventos `voice_line_added` ×2, `voice_line_updated` y `voice_line_removed`; el contador de la tarjeta a 1; `Escape` vuelve a la rejilla y otro `Escape` cierra la ventana con el menú abierto debajo; con Kazuma elegido para hoy, el menú dice su frase.
- **Ilustraciones:** pestaña Bounties con Subaru en Citación y Kazuma contado en Cacería; añadir un WebP desde el selector (con `DataTransfer`) crea `temporal_art_added` con su miniatura y su binario; la vista previa la imprime en sepia; al cumplir seis encargos de Citación salen al azar la de serie y la añadida, también en la animación de verdad; quitarla con dos toques borra su imagen del almacén.
- **1.024 × 700 en japonés:** el editor de frases y las partes del día caben (las horas, sin partirse, tras mover el contador a la esquina).
- **Teléfono (402 × 874):** sin desplazamiento horizontal; las pestañas arriba en fila, tres columnas, el editor de frases en una columna, la rejilla de ilustraciones con la vista previa debajo y los tipos deslizables; la tarjeta Customize a lo ancho en el menú.
- **No se verificó:** la app nativa (macOS, Windows), el selector de archivos del iPhone, la llegada a otro equipo por Drive y el sonido.

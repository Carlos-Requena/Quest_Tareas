# Historial de verificación · Interfaz de teléfono (iPhone)

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/mobile/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## 2026-10-09 · La lente de la barra se mantiene y se arrastra

- La lente deja de ir dentro de cada botón (`layoutId`) y pasa a ser una sola en la barra, movida con valores de Motion: el dedo la arrastra y al soltar va con un muelle.
- **Navegador a 402 × 874** (eventos `touch` sintéticos): la lente sigue al dedo en pasos de 20 px, la barra pasa a `is-pressed`, al soltar sobre «Menú» lo abre y el clic que llega detrás no lo vuelve a cerrar; un toque corto en Tablón o Encargos va directo; con el ratón, el botón de siempre; en reposo, la lente coincide con la pestaña activa (mismo `left` y ancho).
- **Simulador de iOS**, con el dedo (mantener 0,3 s, arrastrar de 掲示板 a カレンダー, soltar), grabado y visto fotograma a fotograma: crece y se aclara al pulsar, se estira al moverse, amplía la pestaña de debajo y al soltar se coloca y abre el calendario.
- **No verificado:** la vibración de cada pestaña (el simulador no vibra).

## 2026-10-09 · Gestos de iOS, vibración y teclado

- **Navegador a 402 × 874**, con eventos de puntero `touch` sintéticos: deslizar una tarjeta 100 px despacio no hace nada; un golpe de 130 px o 220 px despacio la acepta sin abrir el detalle. Volver desde el borde (x = 10) cierra el detalle; desde el centro, no. Bajar el asa 30 px deja la hoja; 200–260 px cierra el alta rápida, los ajustes del menú y la ficha del mercader. En el escritorio (1.024 px), las tarjetas se eligen con el ratón, no hay asas y `touch-action` queda en `auto`.
- **Simulador de iOS** (iPhone 17), con el dedo (`touch_path`): la tarjeta se acepta y sale «Deshacer»; el desplazamiento vertical del tablón sigue; volver desde el borde; bajar la hoja de ajustes. La fila «振動» (vibración) aparece.
- **Fallos encontrados de paso y corregidos:** la velocidad del golpe se medía mal (soltar justo después de mover contaba como golpe: aceptaba con el 60 % del recorrido); un arrastre sin clic al final dejaba marcado «arrastrado» y se comía el siguiente toque («‹ Volver»); `setPointerCapture` podía lanzar un error; la hoja de ajustes quedaba tapada por la barra flotante.
- **No verificado:** la vibración (el simulador no vibra) y los gestos en un iPhone real.

## 2026-10-09 · Barra de abajo de cristal con selector

- La barra plana con una raya dorada encima de la sección activa pasó a ser una **cápsula de cristal** que flota (también sobre el menú) con una **lente que se desliza** hasta la sección activa (Motion, `layoutId`). Medido en el navegador a 402 × 874: del menú al tablón, la lente recorre 292 → 18 px en unos 250 ms, con muelle.
- **No verificado:** el desenfoque (`backdrop-filter`) en un iPhone real; en el simulador se ve.
- **Fallo encontrado de paso:** la vista Día del calendario seguía enseñando la barra de desplazamiento: `scrollbar-width: thin` con selector de clase ganaba a la regla global `*` del teléfono. Pasa a `!important`; un script por todos los contenedores con desplazamiento no encuentra ninguno con barra.

## 2026-10-09 · Desplazamiento y fichas del mercader e inventario

- **«Mi día»** (`.td`): tenía 2 px de desbordamiento horizontal (`scrollWidth` 376 frente a 374), así que en el iPhone se arrastraba de lado al bajar, con la barra a la derecha. Con `overflow-x: hidden` y las barras ocultas en el teléfono, ningún contenedor que solo baja se desplaza de lado (recorrido con un script por todos los elementos con `overflow: auto`).
- **Mercader:** elegir una pieza, ✕ y volver a tocar la fila cierran la ficha; Hu Tao vuelve al saludo. **Almanaque:** volver a tocar el cromo vuelve a la portadilla.
- **No verificado:** el inventario con objetos (la partida de pruebas estaba vacía; es el mismo código que el almanaque) y el iPhone real.

## La barra de abajo

La barra del teléfono tuvo seis botones (Tablón, Encargos, Calendario, Mercader, Personaje y «Más», con un menú «Más» propio) hasta que el menú de opciones (ADR-49) la dejó en cuatro: Tablón · Encargos · Calendario · Menú.

## Fallo encontrado de paso: el clic que se perdía al cerrar una ventana

Al cerrar el mercader, el personaje u otra ventana, su fondo (ya invisible) se quedaba encima hasta 1,4 s, mientras terminaban las animaciones de dentro, y se tragaba el clic siguiente. En el teléfono se notaba en el primer toque en la barra. Se arregló con `BACKDROP_EXIT` y `MODAL_EXIT` (`src/lib/motion.ts`). También mejoró el escritorio.

## Registro hasta el 2026-10-07

- **Tests** (`actions.test.ts`): aceptar en el teléfono cierra la hoja y no acepta hasta que ha salido (un error introducido, quitar la espera, lo detecta); en el escritorio acepta en el acto; reportar no cierra la hoja; con otra quest abierta no espera.
- **Navegador a 402 × 874**, en español: tablón, detalle, aceptar (sello sobre la tarjeta), progreso, reportar con «Quest Clear», «Level Up!» y el cofre (un épico), menú «Más», encargos (formulario, cartel clavado, cartel abierto, encargo cumplido), mercader (elegir pieza), personaje y armario, objetos, almanaque, crónica (deslizar con eventos de puntero) y crear quest. Escritorio a 1.280 × 780: igual que antes.
- **Simulador de iOS 27 (iPhone 17)**, en japonés: arranca, crea la base de datos y la conserva al reinstalar; tocar una tarjeta abre la hoja; aceptar cierra la hoja y el sello cae sobre la tarjeta; el menú «Más» abre.
- **iPhone 15 Pro Max de verdad**: la versión release (17 MB, *bundle ID* `com.requenadonacarlos.quests`) compila, se firma con el Apple ID gratuito y se instala. No se ha abierto todavía: falta confiar en el certificado en el iPhone. Las trampas de Xcode 27 que hubo que resolver están en `docs/AGENTES.md`, «iPhone».
- **Sin probar**: la app abierta en el iPhone; el sonido y la música en iOS (el interruptor de silencio del iPhone puede callar los efectos); los PDF adjuntos (iOS puede enseñar solo la primera página en el visor); el teclado de iOS encima de los formularios; el giro a horizontal; el iPad.

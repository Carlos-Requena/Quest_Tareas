# Historial de verificación · Interfaz de teléfono (iPhone)

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/mobile/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

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

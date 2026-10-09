# Historial de verificación · Menú de opciones

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/menu/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## 2026-10-09 · Artefactos visuales en la ventana de 1.024 px

Hecho con `pnpm dev` en el navegador integrado, con una partida de pruebas con títulos largos (quests, encargos y bloques de agenda), a 1.024 × 768 (la ventana mínima), 1.512 × 945 y 402 × 874, en español y japonés. Un detector en la consola buscaba textos que se salen, se cortan o parten en dos líneas dentro de un botón, y cajas más anchas que su contenedor. `tsc`, `pnpm test`, `pnpm build` y `pnpm docs:check`, en verde.

- **Problema:** el nombre de quien habla partía en dos líneas y «Personajes» se montaba sobre él; «CUSTOMIZE» y «ALMANAC» tocaban el borde de su tarjeta y «Personalización» acababa en «…».
- **Comprobado:** a 1.024 y 1.512 px, en español y japonés. En el teléfono, el lienzo WebGL del personaje se ve blanco en el navegador integrado al emular un móvil, aunque sus píxeles (leídos con `readPixels`) son correctos: es de la captura de este navegador, no de la app (en el escritorio, el mismo lienzo se ve bien).

**No verificado:** el menú del teléfono con el personaje a la vista (por lo anterior), la app nativa, el iPhone de verdad.

## 2026-10-09 · Menú del teléfono al estilo gacha

- **Primero llevó una barra en arco** (la parte de abajo de un anillo enorme, con los botones girados sobre la curva) que tapaba la de abajo. El propietario prefirió no perder alto de pantalla: el mismo día se quitó y la barra de abajo pasó a ser una cápsula de cristal con selector, la misma en todas las pantallas ([mobile](mobile.md)).
- **Navegador a 402 × 874**, en japonés y en español: con el arco, sus cinco botones; después, la barra flotante sobre el menú con el selector en «Menú». «Quests» vuelve al tablón, la crónica se abre encima, la hoja de ajustes se abre y se cierra con ✕ y cambia el idioma. Sin errores en la consola.
- **Escritorio a 1.024 px:** la pantalla de siempre, con las tarjetas.
- **Simulador de iOS** (iPhone 17, compilación de depuración).
- **No verificado:** un iPhone real, pantallas más estrechas que 402 px y el sonido.

## 2026-10-08 · Frases por hora y tarjeta Customize

Con `pnpm dev` en el navegador del panel (Chromium), con datos de prueba.

- **Tests:** frases añadidas, editadas, quitadas, repetidas, vacías, de una parte del día desconocida o de un personaje quitado; las de un personaje añadido se van con él; 50 frases a la misma hora y la elegida según el azar. Los tres eventos entran en `randomStream`.
- **Menú (1.280 × 800 y 402 × 874):** la fila de abajo con cuatro tarjetas (Chronicle, Calendar, Search, Customize) sin salirse del filo de la grande; en el teléfono, Customize a lo ancho como Search. Con Kazuma elegido para hoy y una frase suya de mañana, el menú la dice en lugar de la de serie.
- **No se verificó:** la app nativa ni la llegada de las frases a otro equipo.

## Registro hasta el 2026-10-07

- **Tests** (`model.test.ts`, 16): los personajes añadidos (una vez, quitados sin resucitar, sin los de serie ni los que no traen imagen, sin tocar al jugador, sus imágenes cuentan como usadas); la rotación (todos una vez por vuelta, el orden cambia de vuelta en vuelta, nunca dos días seguidos el mismo con 5, 3 y 2 personajes en 2.000 días, igual sea cual sea el orden de la lista, medianoche y cambio de hora); elegir para hoy no cambia el de mañana y uno quitado vuelve a la rotación. Prueba de mutación: sin el arreglo entre vueltas, falla el test de los días seguidos. Además: las cuatro partes del día en sus bordes; la quest actual es la última aceptada y no cuentan las abandonadas; los días hasta el cambio del escaparate, también la semana del cambio de hora (encontró un fallo: contando milisegundos, el lunes a primera hora de esa semana salían 8 días; ahora se cuentan medianoches).
- **Navegador** (`pnpm dev`), en español y en japonés:
  - Escritorio a 1.280 × 800 y a 1.024 × 680: la pantalla entera, el paralaje y el acercamiento al pasar el ratón; un fotograma del barrido a mitad; la tarjeta grande con tres quests en curso (cambiando el estado solo en memoria, sin escribir eventos); el pie cabe a 1.024 px (con los cuatro botones de ventana de antes ya se salía por la derecha).
  - Flujos: mercader y almanaque encima del menú y `Escape` vuelve a él; `J` abre la crónica y dos `Escape` cierran la crónica y luego el menú; Bounties, Calendar y Quests cambian de sección y cierran el menú; Search cierra el menú y abre la búsqueda; con el menú abierto, `T` no cambia de sección.
  - Personajes (escritorio y teléfono, en japonés): los cinco `.webp` de `public/menu/` salen en el selector; hoy, el de la rotación con «今日»; elegir otro lo marca «選択中», lo pone en pantalla y no cambia el de mañana; «Seguir la rotación» lo quita; añadir un PNG transparente lo guarda en IndexedDB y lo elige para hoy; quitarlo (dos toques) borra su imagen del almacén; Escape cierra el selector sin cerrar el menú.
  - Teléfono a 402 × 874: la barra de cuatro botones, el menú entero desplazándose (tarjetas, coleccionable y ajustes en filas) y sin desplazamiento horizontal.
- **Sin probar**: un personaje añadido llegando a otro equipo por Drive (la imagen sigue el mismo camino que el fondo del mercader), el sonido del barrido (no se ha escuchado), la app nativa de macOS y Windows, el simulador de iOS y un iPhone de verdad, y el rendimiento del 3D en un equipo lento.

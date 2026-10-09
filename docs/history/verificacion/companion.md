# Historial de verificación · Compañero de Mi día

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/companion/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## 2026-10-09 · Artefactos visuales: el marco del cuadro

Hecho con `pnpm dev` en el navegador integrado, con una partida de pruebas con títulos largos (quests, encargos y bloques de agenda), a 1.024 × 768 (la ventana mínima), 1.512 × 945 y 402 × 874, en español y japonés. Un detector en la consola buscaba textos que se salen, se cortan o parten en dos líneas dentro de un botón, y cajas más anchas que su contenedor. `tsc`, `pnpm test`, `pnpm build` y `pnpm docs:check`, en verde.

- **Problema:** en Mi día, el contorno (3 px) y las esquinas doradas (5 px), que asoman fuera de la caja, se recortaban contra el borde de la vista, que se desplaza; además daban 2 px de desplazamiento lateral.
- **Comprobado:** el cuadro con margen alrededor, entero a 1.024 × 768 y 402 × 874.

**No verificado:** la app nativa.

## 2026-10-08 · Primera versión: el cuadro de diálogo y sus frases

En el navegador del panel (Chromium) con datos de prueba, no los del propietario.

- **Tipos, tests y build:** `npx tsc --noEmit`, `pnpm test` y `pnpm build` correctos. Tests nuevos: la situación en orden de urgencia, frases (añadir, editar, quitar, repetidas, vacías, de una situación desconocida o de un personaje que no existe), elegir y quitar al compañero, quién acompaña, los huecos y la frase siguiente. Los cuatro eventos entran en `randomStream`.
- **Escritorio (1.280 × 800, japonés y español):** en Mi día, Kazuma (el personaje de hoy) comenta «Toca hoy» con el título de la quest; al tocar el cuadro dice otra; la frase se escribe letra a letra sin cambiar el alto del cuadro.
- **Teléfono (402 × 874, español):** el retrato recortado al busto; elegir a Aqua con «Que me acompañe en Mi día» y escribirle «¡Arriba! Hoy toca {{title}} y somos {{n}} en el tablón.» en «Toca hoy»: en Mi día sale con el título y un 2.
- **No se verificó:** las demás situaciones en la vista (solo en los tests), la app nativa, el iPhone de verdad y la llegada a otro equipo por Drive.

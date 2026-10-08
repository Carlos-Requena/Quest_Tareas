# Historial de verificación · Compañero de Mi día

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/companion/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## 2026-10-08 · Primera versión: el cuadro de diálogo y sus frases

En el navegador del panel (Chromium) con datos de prueba, no los del propietario.

- **Tipos, tests y build:** `npx tsc --noEmit`, `pnpm test` y `pnpm build` correctos. Tests nuevos: la situación en orden de urgencia, frases (añadir, editar, quitar, repetidas, vacías, de una situación desconocida o de un personaje que no existe), elegir y quitar al compañero, quién acompaña, los huecos y la frase siguiente. Los cuatro eventos entran en `randomStream`.
- **Escritorio (1.280 × 800, japonés y español):** en Mi día, Kazuma (el personaje de hoy) comenta «Toca hoy» con el título de la quest; al tocar el cuadro dice otra; la frase se escribe letra a letra sin cambiar el alto del cuadro.
- **Teléfono (402 × 874, español):** el retrato recortado al busto; elegir a Aqua con «Que me acompañe en Mi día» y escribirle «¡Arriba! Hoy toca {{title}} y somos {{n}} en el tablón.» en «Toca hoy»: en Mi día sale con el título y un 2.
- **No se verificó:** las demás situaciones en la vista (solo en los tests), la app nativa, el iPhone de verdad y la llegada a otro equipo por Drive.

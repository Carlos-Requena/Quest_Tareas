# Historial de verificación · Crónica del aventurero

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/chronicle/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## Registro hasta el 2026-10-07

Hecho el 2026-10-02:

- **Tests** (`model.test.ts`): una entrada por quest completada (un duplicado no), encargo y compra con oro (sin oro no); objetos solo la primera vez; días locales numerados, subidas de nivel y de atributo; en historiales aleatorios, la XP de la crónica cuadra con la del jugador; ninguna página se pasa de renglones, no se pierde ninguna entrada y cada página empieza por un día.
- **Navegador**: con un historial de 14 días, la portadilla, las páginas por días, «(sigue)», el desgaste y la cinta; en japonés a 1.024 × 680 (ahí se vio que el japonés ocupa más y se pasó a medir el texto ya escrito). Un snapshot de la versión anterior se descarta y la crónica sale entera.

**No verificado:** la app nativa y Windows; el sonido de pasar página.

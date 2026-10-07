# Historial de verificación · Editar quests

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/editing/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## Registro hasta el 2026-10-07

Hecho el 2026-10-06.

- **Tests:** `model.test.ts` (parches, campos con `null`, en curso, terminada, objetivos mal formados, círculos, repetición sin fecha) y `store/game.test.ts` (parche mínimo y deshacer, también al volver a abrir la app).
- **Navegador** (`pnpm dev`, 1280 × 820 y 402 × 874): editar el título y poner repetición martes y jueves; parche con solo `title` y `repeatDays`; en curso, objetivos bloqueados con su aviso.

**No verificado:** la app nativa.

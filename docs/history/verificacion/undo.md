# Historial de verificación · Deshacer

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/undo/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## Registro hasta el 2026-10-07

Hecho el 2026-10-06.

- **Tests:** `model.test.ts`; `features/snapshot/snapshot.test.ts` (cortes y evento a evento, como el store: un deshacer recalcula todo); `store/game.test.ts` (editar y deshacer, también tras volver a abrir la app; abandonar y deshacer con el progreso; deshacer algo que ya estaba en el snapshot).
- **Navegador:** alta rápida y `⌘Z` (la quest desaparece y sale «Deshecho: …»); botón «Deshacer» en el aviso del escritorio y del teléfono.

**No verificado:** la app nativa; deshacer en un equipo y sincronizar con otro (cubierto solo por los tests: cuenta igual venga de donde venga).

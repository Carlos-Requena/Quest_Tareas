# Historial de verificación · Objetivo de tipo lista

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/checklist/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## Registro hasta el 2026-10-07

Hecho el 2026-10-02:

- **Tests** (`model.test.ts`): limpieza de casillas, marcar dos veces cuenta una, solo con la quest en curso, aceptar o abandonar las vacía, con todas marcadas se puede reportar y un +1 no la cuenta. Las invariantes de `domain/projection.test.ts` corren sobre historiales con listas.
- **Navegador**: crear una quest con una lista (Enter añade casilla y pone el cursor en ella), marcar casillas con el ratón y con `+`, el botón «Reportar» se enciende con 4/4.

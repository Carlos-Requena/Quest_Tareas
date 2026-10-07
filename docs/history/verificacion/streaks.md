# Historial de verificación · Rachas de las quests que se repiten

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/streaks/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## Registro hasta el 2026-10-07

Hecho el 2026-10-02:

- **Tests** (`model.test.ts`): los plazos de una diaria, sin espera y semanal; suma a tiempo y vuelve a 1 si no, guardando la mejor; se rompe sola con el tiempo y avisa con menos de 6 h; en la proyección, un duplicado no la sube, saltarse días la reinicia y una quest que no se repite no tiene racha.
- **Navegador**: con un historial de 14 días (gimnasio diario con un día saltado), la tarjeta muestra la llama con 4, el detalle «4 veces seguidas · Mejor: 9 · sigue viva antes del sábado 06:00», también en japonés.

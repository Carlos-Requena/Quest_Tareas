# Historial de verificación · Recompensa calculada

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/rewards/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## Registro hasta el 2026-10-07

- `model.test.ts`: cada tipo de objetivo, categoría, redondeo, valores imposibles, la proyección con datos antiguos, lo ganado que no cambia y el encargo al enlazar y desenlazar.
- `store/game.test.ts`: reportar copia la recompensa calculada; el encargo cobra base más bono; las quests completas se publican al guardar, van antes que las rápidas y suben el valor.
- En el navegador (`pnpm dev`, 1.300 × 860): las quests de ejemplo enseñan su recompensa calculada; una élite con 3 × 90 min y ×9 da 690 XP; un encargo pasa de 60 a 200 XP al enlazarla y a 495 XP con 3 calaveras y una quest completa hecha desde el encargo.

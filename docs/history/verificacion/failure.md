# Historial de verificación · Fallos: quests que se fracturan y carteles que se queman

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/failure/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## Registro hasta el 2026-10-07

Hecho el 2026-10-06.

- **Tests:** `model.test.ts`, invariantes de `project()` con fallos en los historiales aleatorios (`randomStream`) y `store/game.test.ts` (`checkFailures` fractura lo vencido y no lo perdonado).
- **Navegador:** una quest y un encargo para hoy, el reloj de la página adelantado a mañana a las 00:05: el encargo se quema, su quest falla con él y la quest se fractura; cola de dos animaciones (capturas a mitad del fuego y de los pedazos con el reloj de GSAP parado), crónica en rojo, cartel quemado en el tablón (0/1, recompensa tachada, «Se quemó el…»), «Volver a clavar» de los dos y búsqueda. También a 402 × 874.

**No verificado:** la app nativa y el iPhone; el sonido (sin altavoces).

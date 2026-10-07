# Historial de verificación · Atributos: una por cada área de tus quests

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/attributes/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## Registro hasta el 2026-10-07

Hecho el 2026-10-02:

- **Tests**: `model.test.ts` (normalización, suma y última forma de escribirla, «__proto__», la curva con sus bordes, el orden, el radar) y en `domain/projection.test.ts`: una quest completada sube su área una sola vez, las quests sin área y los encargos no suben nada, y el invariante de que los atributos nunca suman más XP que el jugador.
- **Áreas conocidas** (2026-10-02): tests de que «Salud», «SALUD» y «健康» son la misma clave y de que las áreas de ejemplo existen en los dos idiomas; en el navegador, el radar y la lista en japonés (健康, 勉強, 読書) con quests escritas en español.
- **Navegador**: seis áreas con XP distinta, el radar con su escala (10) y la lista con niveles y barras, también en japonés. Con un historial y un snapshot de la versión anterior, las quests ya completadas aparecen como atributos al arrancar.

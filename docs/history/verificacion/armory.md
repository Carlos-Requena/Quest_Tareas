# Historial de verificación · Armería de serie: el equipo que trae la app

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/armory/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## Registro hasta el 2026-10-07

Hecho el 2026-10-02:

- **Tests** (`model.test.ts`): claves únicas, ranuras y rarezas válidas, texto en los dos idiomas y ninguno sobrante; al menos 5 piezas por ranura y todas las rarezas; cada icono es un SVG sin `undefined` ni `NaN`; no se pueden crear, editar ni retirar con eventos; se compran (solo con oro suficiente) y se equipan, y retirar otra pieza no las quita.
- **Navegador**: hoja de muestra con los 69 iconos (revisada a ojo; se rehicieron la capucha y las sandalias), la tienda con las piezas de serie en español y en japonés («往年のJRPGより», «標準»), el muñeco con diez piezas de serie puestas, el fondo «Mar de estrellas» detrás del tablón y el emblema de Loto en la cabecera.

**No verificado:** la app nativa y Windows.

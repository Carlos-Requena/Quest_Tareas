# Historial de verificación · Personaje: el muñeco, su equipo y la decoración del menú

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/equipment/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## Registro hasta el 2026-10-07

Hecho el 2026-10-02:

- **Tests**: `model.test.ts` (solo lo tuyo y en su ranura, sustituir, quitar, la decoración igual que la armadura, retirar o cambiar de ranura quita lo puesto, prestigio) y `features/merchant/actions.test.ts` con el store de verdad (no te pones lo que no has comprado, ponérselo dos veces no emite otro evento, lo puesto sobrevive a cerrar y abrir). En `domain/projection.test.ts`, el invariante: solo llevas puesto lo que existe, es tuyo y es de esa ranura.
- **Navegador** (`pnpm dev`, 1280 × 780): las diez ranuras equipadas desde el armario, una a una; el muñeco con las ocho piezas de seis rarezas distintas; el contorno de una ranura vacía al pasar el ratón; el prestigio (39); el fondo comprado detrás del tablón y el emblema en la cabecera; el armario vacío con «Ir al mercader»; la ventana en japonés.

**No verificado:** la app nativa y Windows; el fondo leído de la tabla `blobs` de SQLite; cómo se ve el muñeco con «reducir movimiento» (está en el CSS, no se ha simulado).

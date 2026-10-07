# Historial de verificación · Recuperación ante fallos de la interfaz

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/recovery/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## Registro hasta el 2026-10-07

- Tests de `model.ts` (`model.test.ts`): errores, cosas lanzadas que no son errores y el formato del informe.
- En el navegador (`pnpm dev`): se forzó un fallo real poniendo `state.quests = null` en el store → sale la pantalla (en japonés, el idioma del navegador). Al devolver el estado y pulsar «Volver a intentarlo», vuelve el tablón con sus 5 tarjetas.
- **Sin probar:** el botón de copiar (el portapapeles pide permiso en el navegador de pruebas), la pantalla en español a simple vista (solo se comprobaron los tipos de los textos) y la app nativa.

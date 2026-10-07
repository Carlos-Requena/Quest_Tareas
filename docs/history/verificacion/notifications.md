# Historial de verificación · Notificaciones del sistema

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/notifications/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## Registro hasta el 2026-10-07

Hecho el 2026-10-06.

- **Tests:** `model.test.ts`.
- **`cargo check`** con el plugin y los permisos.
- **Navegador:** con los avisos activados, un bloque de la agenda a 6 minutos: el temporizador lanza a su hora «Llamada con el gestor · Empieza a las 17:19» (la API del navegador sustituida para no pedir permiso).

**No verificado:** los avisos del sistema de verdad en macOS, Windows y, sobre todo, **programados en el iPhone** (el plugin y su parte de iOS no se han compilado para iOS ni probado en el simulador); el permiso de iOS la primera vez; el sonido de los avisos.

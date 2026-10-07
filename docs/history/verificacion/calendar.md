# Historial de verificación · Calendario

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/calendar/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## Registro hasta el 2026-10-07

Hecho el 2026-10-03 con `pnpm dev` en el navegador integrado (1024 × 768 y 402 × 874).

- **Tests:** qué sale un día (quests por su fecha, sin las de otro día, sin fecha ni en reserva; encargos con hora y de todo el día; bloques que se repiten) y el reparto en columnas.
- **Interfaz:** semana con el gimnasio (lunes y jueves), una quest creada desde el «+» del viernes con su fecha límite, un encargo creado desde el «+» del martes (sale sin aceptar), vista día del domingo con un encargo a las 10:00 y un bloque que se solapa (dos columnas), quitar solo el jueves, deslizar a la semana siguiente, japonés y teléfono (semana en filas, día por horas, barra con seis botones).

**No verificado:** la app nativa y el iPhone de verdad (el gesto de deslizar con el dedo se probó con eventos de puntero simulados); el sonido de los botones.

**Mi día y quests por días (2026-10-06):** tests en `features/today/model.test.ts` (también que las quests por días salen de hoy en adelante y tachadas el día que se hicieron). En el navegador (1100 × 720 y 402 × 874, español y japonés): Mi día con una cita y una quest que se pierden esta noche, una quest de martes y jueves en «Toca hoy» y el jueves en «Próximos días», `V` por las tres vistas, chips de lo quemado y lo fracturado.

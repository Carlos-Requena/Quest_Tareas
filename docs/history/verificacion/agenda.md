# Historial de verificación · Agenda

Cómo se verificó esta funcionalidad, fecha a fecha. Es un registro: las cifras y lo que «no se verificó» son de cuando se escribieron. El estado actual está en su [README](../../../src/features/agenda/README.md#estado-actual).

Lo nuevo va arriba: añade una sección `## AAAA-MM-DD · qué se verificó` encima de las anteriores.

## Registro hasta el 2026-10-07

Hecho el 2026-10-03.

- **Tests:** días y cambio de hora (el 25 de octubre), semanas de lunes a domingo, horas del formulario, repetición (días elegidos, `until`, días quitados), guardas (id repetido o retirado, parche que no toca la identidad, día sin bloque, bloque suelto, edición mal formada) y, con el store, crear, editar (parche mínimo), quitar la repetición (`repeat: { days: [] }`), saltar un día y retirar sin tocar al jugador. Los historiales aleatorios incluyen los cuatro eventos.
- **Navegador** (`pnpm dev`, 1024 × 768 y 402 × 874): «Gimnasio» los lunes y jueves de 19:00 a 20:30 (se repite la semana siguiente), «Desayuno con Ana» pulsando en la rejilla del día (se reparte en columnas con un encargo a la misma hora), quitar solo el jueves 1, el formulario en el teléfono y en japonés.

**No verificado:** la app nativa y el iPhone de verdad; dos equipos editando el mismo bloque a la vez (lo cubren las guardas y los tests de la proyección, no una prueba real).

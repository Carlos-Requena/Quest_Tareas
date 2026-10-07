---
adr: ADR-40
titulo: Agenda personal con eventos propios
estado: aceptada
fecha: 2026-10-03
funcionalidades: [agenda]
---

# ADR-40 · Agenda personal con eventos propios

- **Estado:** Aceptada.
- **Registrada:** 2026-10-03 (cuando entró en el informe técnico)
- **Ámbito:** [agenda](../../src/features/agenda/README.md)

## Decisión

Agenda personal con eventos propios (`agenda_created`, `_updated`, `_skipped` y `_deleted`); días como texto `AAAA-MM-DD` en la hora local y horas en minutos; repetición por días de la semana con un último día opcional y días quitados como delta

## Alternativas descartadas

Bloques como quests de la categoría repetible; milisegundos UTC; una regla RRULE completa; guardarla solo en el equipo

## Motivo

Es para organizarse, sin XP ni oro; un bloque de las 9:00 sigue a las 9:00 con el cambio de hora; el propietario solo pidió repetir por días; se tiene que ver en el iPhone

## Consecuencias

`PROJECTION_VERSION` pasa a 9; cambiar de zona horaria mueve los bloques con el reloj del equipo; sin repetición mensual ni avisos

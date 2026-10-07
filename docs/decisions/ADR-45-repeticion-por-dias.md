---
adr: ADR-45
titulo: Repetición por días de la semana
estado: aceptada
fecha: 2026-10-06
funcionalidades: [complex]
---

# ADR-45 · Repetición por días de la semana

- **Estado:** Aceptada.
- **Registrada:** 2026-10-06 (cuando entró en el informe técnico)
- **Ámbito:** [complex](../../src/features/complex/README.md)

## Decisión

Repetición por días de la semana en las quests (`QuestDef.repeatDays`), como la agenda: vuelven a medianoche del siguiente día que toca y la racha dura hasta que acaba ese día; salen en el calendario de hoy en adelante

## Alternativas descartadas

Solo «cada N»; una regla RRULE; quests creadas por cada día

## Motivo

El propietario quiere la planificación unida en el calendario («gimnasio lunes, miércoles y viernes»); un campo opcional no cambia los datos antiguos

## Consecuencias

`PROJECTION_VERSION` pasa a 10; si hay días, mandan sobre la espera

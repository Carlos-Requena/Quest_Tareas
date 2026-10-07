---
adr: ADR-14
titulo: Quests enlazadas a un encargo con eventos delta
estado: aceptada
fecha: 2026-10-02
funcionalidades: [temporal]
---

# ADR-14 · Quests enlazadas a un encargo con eventos delta

- **Estado:** Aceptada.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** [temporal](../../src/features/temporal/README.md)

## Decisión

Quests enlazadas a un encargo con `TemporalDef.questIds` y los eventos `temporal_linked` / `temporal_unlinked`; `temporal_completed` se ignora mientras quede alguna sin terminar

## Alternativas descartadas

`QuestDef.temporalId` fijado al crear la quest; borrar las quests al retirar el encargo

## Motivo

Se pueden enlazar y desenlazar después, como deltas que se suman entre dispositivos; `linkedAt` hace que una repetible cuente solo si se completa tras enlazarla

## Consecuencias

Con el reloj de cada equipo, un encargo cumplido justo tras la última quest podría volver a pendiente al fusionar (lo resuelve el reloj híbrido); retirar un encargo deja sus quests en el tablón

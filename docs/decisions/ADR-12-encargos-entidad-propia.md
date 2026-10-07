---
adr: ADR-12
titulo: Encargos temporales como entidad y tablón propios
estado: aceptada
fecha: 2026-10-02
funcionalidades: [temporal]
---

# ADR-12 · Encargos temporales como entidad y tablón propios

- **Estado:** Aceptada.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** [temporal](../../src/features/temporal/README.md)

## Decisión

Encargos temporales como entidad y tablón propios (`TemporalDef`, sección aparte)

## Alternativas descartadas

Una cuarta categoría de quest

## Motivo

Tienen fecha y se cumplen una vez: no se aceptan ni tienen objetivos ni esperas

## Consecuencias

Comparten con las quests la recompensa (XP y oro suman al jugador), no `completedCount` ni los drops

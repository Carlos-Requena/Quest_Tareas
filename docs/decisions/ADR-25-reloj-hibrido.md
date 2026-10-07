---
adr: ADR-25
titulo: Reloj lógico híbrido dentro de ts
estado: aceptada
fecha: 2026-10-02
funcionalidades: [snapshot, sync]
---

# ADR-25 · Reloj lógico híbrido dentro de ts

- **Estado:** Aceptada.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** [snapshot](../../src/features/snapshot/README.md) · [sync](../../src/features/sync/README.md)

## Decisión

Reloj lógico híbrido dentro de `ts`: max(reloj, último aplicado + 1 ms), también si el último es de otro equipo, con una deriva máxima de 1 minuto

## Alternativas descartadas

HLC clásico con contador y hora física en campos aparte; relojes vectoriales; ids ordenables en el tiempo

## Motivo

Mantiene la causalidad entre equipos sin cambiar el formato de los eventos, las consultas de SQLite ni el snapshot; el orden total (ts, id) sigue siendo el mismo en todos los equipos

## Consecuencias

El `ts` puede adelantarse hasta 1 minuto al reloj; un equipo con más deriva recalcula todo hasta que su reloj lo alcanza

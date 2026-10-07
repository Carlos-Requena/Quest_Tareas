---
adr: ADR-17
titulo: ts de un evento nuevo: último aplicado + 1 ms
estado: sustituida
por: [ADR-25]
fecha: 2026-10-02
funcionalidades: [snapshot]
---

# ADR-17 · ts de un evento nuevo: último aplicado + 1 ms

- **Estado:** Sustituida por [ADR-25](ADR-25-reloj-hibrido.md). El reloj lógico híbrido (ADR-25) generaliza esta regla a varios equipos y sube la deriva máxima de 1 s a 1 minuto.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** [snapshot](../../src/features/snapshot/README.md)

## Decisión

El ts de un evento nuevo es como mínimo el del último aplicado + 1 ms si el reloj no ha avanzado o va por detrás menos de 1 s (nextTs)

## Alternativas descartadas

Ids ordenables en el tiempo (UUID v7, ULID); un contador por equipo; esperar al reloj híbrido

## Motivo

Las acciones que emiten varios eventos lo hacen en el mismo milisegundo y el desempate por id aleatorio los reordenaba (un quest_completed antes de su quest_accepted). Es el arreglo más pequeño y no cambia el formato de los eventos

## Consecuencias

El ts puede adelantarse unos milisegundos al reloj; un retraso de más de 1 s sigue recalculándolo todo. El reloj híbrido sigue pendiente para varios dispositivos

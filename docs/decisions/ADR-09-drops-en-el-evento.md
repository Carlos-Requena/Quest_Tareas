---
adr: ADR-09
titulo: Drops tirados en la acción y guardados en quest_completed
estado: aceptada
fecha: 2026-10-02
funcionalidades: [items]
---

# ADR-09 · Drops tirados en la acción y guardados en quest_completed

- **Estado:** Aceptada.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** [items](../../src/features/items/README.md)

## Decisión

Drops aleatorios resueltos en la acción y guardados dentro de `quest_completed`

## Alternativas descartadas

Tirar en la proyección con semilla; evento `item_dropped` aparte

## Motivo

La proyección sigue siendo determinista y el botín hereda la guarda contra completados duplicados

## Consecuencias

El pity se recalcula reproduciendo los drops; cambiar las tablas no altera lo ya ganado

---
adr: ADR-02
titulo: Event sourcing en lugar de guardar estado
estado: aceptada
fecha: 2026-10-02
funcionalidades: []
---

# ADR-02 · Event sourcing en lugar de guardar estado

- **Estado:** Aceptada.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** Transversal

## Decisión

Event sourcing en lugar de guardar estado

## Alternativas descartadas

Tablas con estado actual + última escritura gana

## Motivo

Fusión sin conflictos entre dispositivos e historial completo

## Consecuencias

Hace falta versionado de eventos y snapshots al crecer

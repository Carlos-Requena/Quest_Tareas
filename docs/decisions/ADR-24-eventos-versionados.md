---
adr: ADR-24
titulo: Versión en cada evento con conversión paso a paso
estado: aceptada
fecha: 2026-10-02
funcionalidades: []
---

# ADR-24 · Versión en cada evento con conversión paso a paso

- **Estado:** Aceptada.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** Transversal

## Decisión

Versión en cada evento (`v`, `EVENT_VERSION`) con conversión paso a paso al aplicarlo (`UPCASTERS`); los eventos de una versión futura se ignoran

## Alternativas descartadas

Solo upcasters por forma, como `legacy.ts`; reescribir los eventos al migrar; rechazar los de una versión futura

## Motivo

Con la sincronización, cada cambio de formato llegará a equipos con versiones distintas; la versión explícita dice qué conversión toca sin adivinar por la forma

## Consecuencias

Cambiar un formato obliga a subir `EVENT_VERSION` y `PROJECTION_VERSION`; un equipo sin actualizar no ve lo que hacen los actualizados hasta actualizarse

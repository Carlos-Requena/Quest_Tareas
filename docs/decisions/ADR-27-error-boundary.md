---
adr: ADR-27
titulo: Error boundary en la raíz con pantalla de recuperación
estado: aceptada
fecha: 2026-10-02
funcionalidades: [recovery]
---

# ADR-27 · Error boundary en la raíz con pantalla de recuperación

- **Estado:** Aceptada.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** [recovery](../../src/features/recovery/README.md)

## Decisión

Un error boundary en la raíz con pantalla de recuperación (`features/recovery`) que vuelve a montar la app sin recargar

## Alternativas descartadas

Uno por sección; recargar sin más

## Motivo

Un fallo a medias deja estados raros; volver a montar conserva el store y descarta el estado local roto

## Consecuencias

Un fallo en un rincón tapa toda la ventana hasta reintentar

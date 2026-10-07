---
adr: ADR-16
titulo: Snapshot del acumulador de la proyección
estado: aceptada
fecha: 2026-10-02
funcionalidades: [snapshot]
---

# ADR-16 · Snapshot del acumulador de la proyección

- **Estado:** Aceptada.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** [snapshot](../../src/features/snapshot/README.md)

## Decisión

Snapshot del acumulador de la proyección en la tabla meta cada 100 eventos, válido si coinciden PROJECTION_VERSION y el número de eventos hasta upTo; dispatch aplica solo el evento nuevo sobre una copia (structuredClone)

## Alternativas descartadas

Guardar GameState; validar con un hash de todos los eventos; actualizaciones inmutables a mano en cada case; guardar en cada evento

## Motivo

Arrancar sin leer todo el historial; el recuento detecta cualquier evento que entre en medio, porque nunca se borran; la copia no obliga a tocar el switch ni los modelos

## Consecuencias

Hay que subir PROJECTION_VERSION al cambiar project() (en desarrollo se avisa si se olvida); el snapshot es una caché local que no se sincroniza

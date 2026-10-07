---
adr: ADR-22
titulo: Rachas y crónica calculadas en la proyección
estado: aceptada
fecha: 2026-10-02
funcionalidades: [streaks, chronicle]
---

# ADR-22 · Rachas y crónica calculadas en la proyección

- **Estado:** Aceptada.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** [streaks](../../src/features/streaks/README.md) · [chronicle](../../src/features/chronicle/README.md)

## Decisión

Rachas y crónica calculadas en la proyección (`QuestState.streak`, `ProjectionAcc.chronicle`), apuntadas solo cuando un evento pasa sus guardas

## Alternativas descartadas

Eventos propios; leer el historial de SQLite al abrir la crónica

## Motivo

Retroactivas, sin duplicados entre dispositivos y sin repetir las guardas fuera del dominio

## Consecuencias

La crónica crece con el snapshot (unos 270 KB al año); `PROJECTION_VERSION` pasa a 3

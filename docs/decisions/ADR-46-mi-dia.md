---
adr: ADR-46
titulo: El calendario como sitio de planificación, con Mi día
estado: aceptada
fecha: 2026-10-06
funcionalidades: [today, calendar]
---

# ADR-46 · El calendario como sitio de planificación, con Mi día

- **Estado:** Aceptada.
- **Registrada:** 2026-10-06 (cuando entró en el informe técnico)
- **Ámbito:** [today](../../src/features/today/README.md) · [calendar](../../src/features/calendar/README.md)

## Decisión

El calendario como sitio de planificación con «Mi día» (features/today) como primera vista; los plazos se quedan solo como filtro de los tablones

## Alternativas descartadas

Una sección «Hoy» aparte; abrir la app en Mi día; mantener vistas por plazo

## Motivo

Menos conceptos que se solapan; la app sigue abriendo en el Quest Board, como quiere el propietario

## Consecuencias

Mi día se calcula sin eventos; `V` pasa por tres vistas

---
adr: ADR-42
titulo: Editar quests con quest_updated
estado: aceptada
fecha: 2026-10-06
funcionalidades: [editing]
---

# ADR-42 · Editar quests con quest_updated

- **Estado:** Aceptada.
- **Registrada:** 2026-10-06 (cuando entró en el informe técnico)
- **Ámbito:** [editing](../../src/features/editing/README.md)

## Decisión

Editar quests con `quest_updated`: un parche con solo lo que cambia, `null` para quitar, guardas en la proyección (terminada no; en curso, sin objetivos, categoría ni repetición; requisitos sin círculos) y recompensa recalculada

## Alternativas descartadas

Un evento por campo; reemplazar la definición entera; permitir cambiar los objetivos en curso

## Motivo

Dos equipos que cambian cosas distintas suman; `undefined` no sobrevive al JSON; cambiar las reglas a mitad rompería el progreso y los pomodoros

## Consecuencias

Lo ganado no cambia (va copiado); un cambio de objetivos en curso hay que hacerlo tras abandonarla

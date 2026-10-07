---
adr: ADR-13
titulo: Repetición y requisitos como campos opcionales de QuestDef
estado: ampliada
por: [ADR-42]
fecha: 2026-10-02
funcionalidades: [complex]
---

# ADR-13 · Repetición y requisitos como campos opcionales de QuestDef

- **Estado:** Ampliada por [ADR-42](ADR-42-editar-quests.md). Desde ADR-42 las quests se editan (`quest_updated`): repetición y requisitos ya se pueden cambiar, salvo con la quest en curso.
- **Registrada:** 2026-10-02 (cuando entró en el informe técnico)
- **Ámbito:** [complex](../../src/features/complex/README.md)

## Decisión

Repetición (en cualquier categoría) y requisitos como campos opcionales de `QuestDef`, con una guarda en la proyección: `quest_accepted` se ignora si faltan requisitos

## Alternativas descartadas

Eventos nuevos para los requisitos; una categoría «cadena»; comprobarlo solo en la acción

## Motivo

La definición ya viaja entera en `quest_created` y los datos antiguos se leen igual; con la guarda, todos los dispositivos llegan al mismo estado

## Consecuencias

Repetición y requisitos no se editan hasta que exista `quest_updated`; un requisito retirado deja de bloquear

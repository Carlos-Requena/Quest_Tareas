---
adr: ADR-39
titulo: Contactos escritos a mano y abiertos con tauri-plugin-opener
estado: ampliada
por: [ADR-42]
fecha: 2026-10-03
funcionalidades: [contacts]
---

# ADR-39 · Contactos escritos a mano y abiertos con tauri-plugin-opener

- **Estado:** Ampliada por [ADR-42](ADR-42-editar-quests.md). Desde ADR-42 los contactos de una quest se editan con el resto de la quest (`quest_updated`).
- **Registrada:** 2026-10-03 (cuando entró en el informe técnico)
- **Ámbito:** [contacts](../../src/features/contacts/README.md)

## Decisión

Contactos escritos a mano dentro de `QuestDef` y `TemporalDef`, y abiertos con `tauri-plugin-opener`, con `opener:allow-open-url` limitado a `tel:`, `mailto:` y `https:`

## Alternativas descartadas

Elegirlos de la agenda del sistema; eventos propios de contactos; el crate `open` (ya en la app); `opener:default`; un comando propio en Swift

## Motivo

El propietario los quiere escritos a mano; el crate `open` no funciona dentro de una app de iOS; `opener:default` también deja revelar archivos; dentro de la definición viajan y se sincronizan con la quest

## Consecuencias

Un plugin y un permiso más; los contactos de una quest no se editan hasta que exista `quest_updated`; los de un encargo sí (lista entera en el parche)

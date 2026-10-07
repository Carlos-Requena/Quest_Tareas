---
funcionalidad: editing
titulo: Editar quests
resumen: Editar una quest publicada con el mismo formulario (tecla R o ✎), con un parche que solo lleva lo que cambia.
tipo: dominio
eventos: [quest_updated]
preferencias: []
adr: [ADR-42]
---

# Editar quests

Una quest publicada se **edita** con el mismo formulario del Quest Board, relleno y con «Guardar cambios». Se abre con la tecla `R` o el botón ✎ del detalle (en el teléfono, «Editar»). La quest conserva su id, su racha, las veces completada y sus enlaces.

## Qué hace

| # | Requisito | Cómo se cumple |
|---|---|---|
| R1 | Corregir una quest sin perder su historial | Evento `quest_updated` con un parche |
| R2 | Que dos equipos que editan cosas distintas no se pisen | El parche solo lleva lo que cambia (`diffQuest`) |
| R3 | Que no se rompa una quest a medias | Con la quest en curso no cambian objetivos, categoría ni repetición |
| R4 | Poder arrepentirse | Se deshace unos minutos ([undo](../undo/README.md)) |

## Reglas y decisiones

### Un parche con lo que cambia

```ts
{ type: "quest_updated"; questId: string; patch: QuestPatch }
```

`QuestPatch` tiene los campos de `QuestDef` que se pueden cambiar. En los opcionales, **`null` quita el valor** (`dueAt: null` deja la quest sin fecha límite): JSON no transporta `undefined`. El formulario calcula el parche mínimo con `diffQuest`; si no cambia nada, no se emite ningún evento. Por qué un parche y no la definición entera: [ADR-42](../../../docs/decisions/ADR-42-editar-quests.md).

### Guardas de la proyección (`patchQuest`)

| Caso | Qué pasa |
|---|---|
| La quest está terminada (completada o fallida) | Se ignora: es historia |
| La quest está en curso | Se ignoran `category`, `conditions`, `cooldownMinutes` y `repeatDays` (`STRUCTURAL_KEYS`): tienen progreso y pomodoros en marcha. El formulario los bloquea y lo explica |
| Título vacío, objetivos mal formados, categoría desconocida | Ese campo no cambia; el resto del parche sí |
| Requisitos que cerrarían un círculo | Se quitan (`wouldCycle`, [complex](../complex/README.md)) |
| La quest pasa a repetirse | Pierde la fecha límite, como al crearla |

La **recompensa** se recalcula con los objetivos y la categoría nuevos ([rewards](../rewards/README.md)); lo ya ganado no cambia porque va copiado en `quest_completed`. Si cambian los objetivos (fuera de curso), sus pomodoros empiezan de cero. Para cambiar los objetivos de una quest en curso, primero se abandona.

### El mismo formulario

`QuestFormModal` (`src/components/CreateQuestModal.tsx`) acepta `edit` (la quest que se edita) e `initial` (datos de partida para una nueva: el alta rápida y las copias de una fallida). Los objetivos conservan su id al editarlos, porque el progreso va por id.

## Eventos

| Evento | Datos | Efecto | Guarda |
|---|---|---|---|
| `quest_updated` | `questId`, `patch` | Aplica el parche limpio (`patchQuest`) y recalcula la recompensa | La quest existe y no está terminada; en curso, sin los campos estructurales |

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | `QuestPatch`, `STRUCTURAL_KEYS`, `isEditable`, `patchQuest`, `diffQuest`. Puro |
| `events.ts` | `quest_updated` |
| `actions.ts` | `openEdit`, `saveQuestEdit` (con «Deshacer») |
| `ui.ts` | Quest que se edita y datos de partida de una nueva (`draft`); `editingBusy` |
| `components/EditQuestModal.tsx` | El formulario en modo edición |
| `i18n.ts` | Textos es + ja |
| `model.test.ts` | Parches, `null`, en curso, terminada, objetivos mal formados, círculos, repetición sin fecha |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src/domain/events.ts` | La unión suma `EditingEventBody` |
| `src/domain/projection.ts` | `case "quest_updated"` |
| `src/components/CreateQuestModal.tsx` | Props `edit` e `initial`; objetivos bloqueados en curso (`fieldset`); abre también con `draft` |
| `src/components/QuestDetail.tsx` | Botón ✎ (tecla `R`) |
| `src/App.tsx` | Tecla `R`, `EditQuestModal`, `editingBusy()` |
| `src/features/complex/components/RequiresField.tsx` | Recibe `forQuest` (sin ella ni las que dependen de ella) |
| `src/i18n/locales/{es,ja}.ts` | Montan `editing` |

## Dependencias

- **features/checklist**, **features/contacts**, **features/pomodoro** (`model.ts`): limpian sus objetivos y contactos al aplicar el parche, igual que al crear.
- **features/complex** (`model.ts`: `wouldCycle`, `cleanRequires`): requisitos sin círculos.
- **features/rewards** (`model.ts`: `questReward`): la recompensa recalculada.
- **features/undo** (`actions.ts`: `offerUndo`): el aviso con «Deshacer».
- Ninguno de esos README hace falta salvo para cambiar sus reglas.
- **La usan:** `quickadd` y `failure` (abren el formulario con datos de partida), `menu`, `calendar` y `temporal` (su teclado espera con el formulario abierto).

## Estado actual

- **Última verificación:** 2026-10-06, tests y navegador a 1280 × 820 y 402 × 874 (parche con solo `title` y `repeatDays`; en curso, objetivos bloqueados con su aviso).
- **Tests:** `model.test.ts` y `src/store/game.test.ts` (parche mínimo y deshacer, también al volver a abrir la app).
- **Sin verificar:** la app nativa.
- **Historial:** [docs/history/verificacion/editing.md](../../../docs/history/verificacion/editing.md).

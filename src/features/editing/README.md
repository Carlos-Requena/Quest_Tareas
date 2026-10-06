# Editar quests

Una quest ya publicada se puede **editar**: el mismo formulario del Quest Board, relleno, con «Guardar cambios». Se abre con la tecla `R` o el botón ✎ del detalle (en el teléfono, «Editar»). Antes, para corregir un título o mover una fecha había que retirarla y crearla otra vez, perdiendo su racha y su historial.

Sigue la convención del proyecto: **una carpeta por implementación** (`src/features/<nombre>/`).

---

## Requisitos

| # | Requisito | Cómo se cumple |
|---|---|---|
| R1 | Corregir una quest sin perder su historial | Evento `quest_updated` con un parche; la quest conserva su id, racha, veces completada y enlaces |
| R2 | Que dos equipos que editan cosas distintas no se pisen | El parche solo lleva lo que cambia (`diffQuest`) |
| R3 | Que no se rompa una quest a medias | Con la quest en curso no cambian objetivos, categoría ni repetición |
| R4 | Poder arrepentirse | Se puede deshacer unos minutos (features/undo) |

---

## Decisiones de diseño

### Un parche con lo que cambia

```ts
{ type: "quest_updated"; questId: string; patch: QuestPatch }
```

`QuestPatch` tiene los campos de `QuestDef` que se pueden cambiar. En los opcionales, **`null` quita el valor** (`dueAt: null` deja la quest sin fecha límite): JSON no transporta `undefined`, así que un `undefined` se perdería al sincronizar. El formulario calcula el parche mínimo con `diffQuest`; si no cambia nada, no se emite ningún evento.

### Guardas de la proyección (`patchQuest`)

| Caso | Qué pasa |
|---|---|
| La quest está terminada (completada o fallida) | Se ignora: es historia |
| La quest está en curso | Se ignoran `category`, `conditions`, `cooldownMinutes` y `repeatDays` (`STRUCTURAL_KEYS`): tienen progreso y pomodoros en marcha. El formulario los bloquea y lo explica |
| Título vacío, objetivos mal formados, categoría desconocida | Ese campo no cambia; el resto del parche sí |
| Requisitos que cerrarían un círculo | Se quitan (`wouldCycle`, features/complex). Al crear no podía pasar; al editar, sí |
| La quest pasa a repetirse | Pierde la fecha límite, como al crearla |

La **recompensa** se recalcula con los objetivos y la categoría nuevos (features/rewards). Lo ya ganado no cambia: va copiado en `quest_completed`. Si cambian los objetivos (fuera de curso), sus pomodoros empiezan de cero.

### El mismo formulario

`QuestFormModal` (en `components/CreateQuestModal.tsx`) acepta `edit` (la quest que se edita) e `initial` (datos de partida para una quest nueva: el alta rápida y las copias de una fallida). Los objetivos conservan su id al editarlos: el progreso va por id.

---

## Eventos

| Evento | Datos | Efecto | Guarda |
|---|---|---|---|
| `quest_updated` | `questId`, `patch` | Aplica el parche limpio (`patchQuest`) y recalcula la recompensa | La quest existe y no está terminada; en curso, sin los campos estructurales |

---

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | `QuestPatch`, `STRUCTURAL_KEYS`, `isEditable`, `patchQuest`, `diffQuest`. Puro |
| `events.ts` | `quest_updated` |
| `actions.ts` | `openEdit`, `saveQuestEdit` (con «Deshacer») |
| `ui.ts` | Quest que se edita y datos de partida de una nueva (`draft`) |
| `i18n.ts` | Textos es + ja |
| `components/EditQuestModal.tsx` | El formulario en modo edición |
| `model.test.ts` | Parches, guardas, círculos y `diffQuest` |

## Puntos de integración

| Fuera de la carpeta | Cambio |
|---|---|
| `domain/events.ts` | La unión suma `EditingEventBody` |
| `domain/projection.ts` | `case "quest_updated"` |
| `components/CreateQuestModal.tsx` | Props `edit` e `initial`; objetivos bloqueados en curso (`fieldset`); abre también con `draft` |
| `components/QuestDetail.tsx` | Botón ✎ (tecla `R`) |
| `App.tsx` | Tecla `R`, `EditQuestModal`, `editingBusy()` |
| `features/complex` | `RequiresField` recibe `forQuest` (sin ella ni las que dependen de ella) |
| `i18n/locales/{es,ja}.ts` | Montan `editing` |

---

## Verificación

Hecho el 2026-10-06.

- **Tests:** `model.test.ts` (parches, campos con `null`, en curso, terminada, objetivos mal formados, círculos, repetición sin fecha) y `store/game.test.ts` (parche mínimo y deshacer, también al volver a abrir la app).
- **Navegador** (`pnpm dev`, 1280 × 820 y 402 × 874): editar el título y poner repetición martes y jueves; parche con solo `title` y `repeatDays`; en curso, objetivos bloqueados con su aviso.

**No verificado:** la app nativa.

---
funcionalidad: undo
titulo: Deshacer
resumen: Lo hecho por error se deshace unos minutos (⌘Z o el botón del aviso) con otro evento que la proyección salta.
tipo: dominio
eventos: [event_undone]
preferencias: []
adr: [ADR-43]
---

# Deshacer

Cada acción que se puede deshacer deja un aviso con el botón «Deshacer», y `⌘Z` / `Ctrl+Z` deshace la última de la sesión, durante 15 minutos.

## Qué hace

| # | Requisito | Cómo se cumple |
|---|---|---|
| R1 | Deshacer un abandono, un retiro o una edición sin querer | Evento `event_undone`: la proyección salta el evento deshecho |
| R2 | Sin romper el event sourcing | Ningún evento se borra: deshacer es otro evento |
| R3 | Igual en todos los equipos | La regla es pura (`undoneIn`) y depende solo de los eventos |
| R4 | Sin trampas con el botín | Completar una quest no se deshace |

## Reglas y decisiones

`project()` mira primero qué eventos están deshechos (`undoneIn`) y reproduce el resto: el resultado es el mismo que si el evento no hubiera existido ([ADR-43](../../../docs/decisions/ADR-43-deshacer.md)). Un `event_undone` cuenta si su evento está en el historial, es de un tipo que se puede deshacer (`UNDOABLE`) y no han pasado más de **15 minutos** (`UNDO_WINDOW_MS`) entre los dos.

| Se puede deshacer | No se puede deshacer |
|---|---|
| Crear, editar, aceptar, abandonar y retirar quests; clavar, editar, aceptar, aplazar, enlazar, desenlazar y retirar encargos; crear, editar, quitar un día y retirar bloques de la agenda | Completar una quest (se volvería a tirar el cofre), cumplir un encargo, comprar y los fallos; tampoco adjuntar o quitar un adjunto, ni quitar un personaje del menú (su imagen ya se habría borrado) |

### Deshacer recalcula todo

Deshacer cambia el pasado y no se puede aplicar sobre la proyección incremental:

- **`dispatch`** de un `event_undone`: guarda el evento y llama a `rebuild()`.
- **Arranque** (`restore`): si la cola tras el snapshot trae un deshacer, se reproduce todo (`hasUndo`).
- **`applyAll`** salta lo deshecho dentro de la lista que recibe.

Es raro (unas pocas veces al día) y el coste no se nota. Por eso los adjuntos de un encargo retirado se borran del almacén **pasada la ventana** y solo si nadie los usa; si la app se cierra antes, el archivo se queda (una fuga pequeña e inofensiva).

## Eventos

| Evento | Datos | Efecto | Guarda |
|---|---|---|---|
| `event_undone` | `eventId` | La proyección salta ese evento (`case "event_undone"` no hace nada) | Existe, es de `UNDOABLE` y como mucho 15 min después |

## Interfaz

- `offerUndo(evento, texto)` enseña el aviso con «Deshacer» (7 s en vez de 4,5 s). `dispatch` devuelve el evento guardado para poder ofrecerlo; el aviso con botón es `GameStore.say(texto, acción?)`, pintado por `Toast`.
- `⌘Z` / `Ctrl+Z` (fuera de los campos de texto) deshace lo último de la sesión que siga dentro de la ventana.

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | `UNDO_WINDOW_MS`, `UNDOABLE`, `isUndoable`, `undoneIn`, `hasUndo`. Puro |
| `events.ts` | `event_undone` |
| `actions.ts` | `offerUndo`, `undo`, `undoLast` (pila de la sesión), `resetUndo` |
| `i18n.ts` | Textos es + ja |
| `model.test.ts` | Saltar lo deshecho, ventana, tipos que no se deshacen, otro equipo, `applyAll` = `project` |

## Integración

| Fuera de la carpeta | Cambio |
|---|---|
| `src/domain/events.ts` | La unión suma `UndoEventBody` |
| `src/domain/projection.ts` | `project()` salta lo deshecho |
| `src/features/snapshot/model.ts`, `src/features/snapshot/restore.ts` | `applyAll` salta lo deshecho; `restore` reproduce todo si hay un deshacer en la cola |
| `src/store/game.ts` | `dispatch` devuelve el evento y recalcula todo con un deshacer; `say` con botón |
| `src/store/actions.ts` | Avisos con «Deshacer» al aceptar, abandonar y retirar quests |
| `src/components/QuestDetail.tsx` | `Toast` con botón; `retireQuest` |
| `src/App.tsx` | `⌘Z` / `Ctrl+Z` |
| `src/test/streams.ts` | `randomStream` emite `event_undone` |

## Dependencias

- No importa otras funcionalidades.
- **La usan:** `agenda`, `editing`, `quickadd` y `temporal` (avisos con «Deshacer») y `snapshot` (saltar lo deshecho).

## Estado actual

- **Última verificación:** 2026-10-06, tests y navegador (alta rápida y `⌘Z`; el botón «Deshacer» en el escritorio y en el teléfono).
- **Tests:** `model.test.ts`, `src/features/snapshot/snapshot.test.ts` y `src/store/game.test.ts` (también deshacer tras volver a abrir la app y algo que ya estaba en el snapshot).
- **Sin verificar:** la app nativa; deshacer en un equipo y sincronizar con otro (solo los tests: cuenta igual venga de donde venga).
- **Historial:** [docs/history/verificacion/undo.md](../../../docs/history/verificacion/undo.md).

# Deshacer

Lo que se hace por error se puede **deshacer** unos minutos: cada acción que se puede deshacer deja un aviso con el botón «Deshacer», y `⌘Z` / `Ctrl+Z` deshace la última de la sesión.

Sigue la convención del proyecto: **una carpeta por implementación** (`src/features/<nombre>/`).

---

## Requisitos

| # | Requisito | Cómo se cumple |
|---|---|---|
| R1 | Deshacer un abandono, un retiro o una edición sin querer | Evento `event_undone`: la proyección salta el evento deshecho |
| R2 | Sin romper el event sourcing | Ningún evento se borra: deshacer es otro evento |
| R3 | Igual en todos los equipos | La regla es pura (`undoneIn`) y depende solo de los eventos |
| R4 | Sin trampas con el botín | Completar una quest no se deshace |

---

## Decisiones de diseño

### Un evento que anula otro

```ts
{ type: "event_undone"; eventId: string }
```

`project()` mira primero qué eventos están deshechos (`undoneIn`) y reproduce el resto: el resultado es el mismo que si el evento no hubiera existido. Un `event_undone` cuenta si:

- su evento está en el historial y es de un tipo que se puede deshacer (`UNDOABLE`);
- no han pasado más de **15 minutos** (`UNDO_WINDOW_MS`) entre los dos. Después, ya es historia.

**Se puede deshacer:** crear, editar, aceptar, abandonar y retirar quests; editar, aceptar, aplazar, enlazar, desenlazar y retirar encargos; crear, editar, quitar un día y quitar bloques de la agenda.

**No se puede deshacer:** completar una quest (se volvería a tirar el cofre), cumplir un encargo, comprar (lo ganado y lo pagado no se deshacen) y los fallos.

### Deshacer recalcula todo

Deshacer cambia el pasado, así que no se puede aplicar sobre la proyección incremental:

- **`dispatch`** de un `event_undone`: guarda el evento y llama a `rebuild()`, como con un evento remoto antiguo.
- **Arranque** (`restore`): si la cola tras el snapshot trae un deshacer, se reproduce todo (`hasUndo`).
- **`applyAll`** salta lo deshecho dentro de la lista que recibe; con todos los eventos (rebuild) es exacto.

Es raro (unas pocas veces al día), así que el coste de reproducirlo todo no se nota.

### Archivos de un encargo retirado

Retirar un encargo borraba sus adjuntos del almacén de binarios. Ahora se borran **pasada la ventana de deshacer** (y solo si nadie los usa): si se deshace, siguen en su sitio. Si la app se cierra antes, el archivo se queda (una pequeña fuga, inofensiva).

### Interfaz

- `offerUndo(evento, texto)` enseña el aviso de siempre con el botón «Deshacer» (7 s en vez de 4,5 s). `dispatch` devuelve el evento guardado para poder ofrecerlo.
- `⌘Z` / `Ctrl+Z` (fuera de los campos de texto) deshace lo último de la sesión que siga dentro de la ventana.
- El aviso tiene un botón: `GameStore.say(texto, acción?)`, pintado por `Toast`.

---

## Eventos

| Evento | Datos | Efecto | Guarda |
|---|---|---|---|
| `event_undone` | `eventId` | La proyección salta ese evento | Existe, es de `UNDOABLE` y como mucho 15 min después |

---

## Archivos

| Archivo | Contenido |
|---|---|
| `model.ts` | `UNDO_WINDOW_MS`, `UNDOABLE`, `undoneIn`, `hasUndo`. Puro |
| `events.ts` | `event_undone` |
| `actions.ts` | `offerUndo`, `undo`, `undoLast` (pila de la sesión) |
| `i18n.ts` | Textos es + ja |
| `model.test.ts` | Saltar lo deshecho, ventana, tipos que no se deshacen, otro equipo, `applyAll` = `project` |

## Puntos de integración

| Fuera de la carpeta | Cambio |
|---|---|
| `domain/events.ts` | La unión suma `UndoEventBody` |
| `domain/projection.ts` | `project()` salta lo deshecho; `case "event_undone"` no hace nada |
| `features/snapshot` | `applyAll` salta lo deshecho; `restore` reproduce todo si hay un deshacer en la cola |
| `store/game.ts` | `dispatch` devuelve el evento y recalcula todo con un deshacer; `say` con botón |
| `store/actions.ts`, `features/temporal/actions.ts`, `features/agenda/actions.ts`, `features/editing`, `features/quickadd` | Avisos con «Deshacer» |
| `components/QuestDetail.tsx` | `Toast` con botón; `retireQuest` |
| `App.tsx` | `⌘Z` / `Ctrl+Z` |
| `test/streams.ts` | `randomStream` emite `event_undone` |

---

## Verificación

Hecho el 2026-10-06.

- **Tests:** `model.test.ts`; `features/snapshot/snapshot.test.ts` (cortes y evento a evento, como el store: un deshacer recalcula todo); `store/game.test.ts` (editar y deshacer, también tras volver a abrir la app; abandonar y deshacer con el progreso; deshacer algo que ya estaba en el snapshot).
- **Navegador:** alta rápida y `⌘Z` (la quest desaparece y sale «Deshecho: …»); botón «Deshacer» en el aviso del escritorio y del teléfono.

**No verificado:** la app nativa; deshacer en un equipo y sincronizar con otro (cubierto solo por los tests: cuenta igual venga de donde venga).

// Modelo puro de deshacer: sin React, sin store, sin Tauri, sin DOM.
// El dominio (src/domain) importa SOLO model.ts y events.ts, nunca index.ts.
//
// Los eventos guardados no se borran nunca. Deshacer es OTRO evento, `event_undone`,
// que dice «el evento X no cuenta». La proyección mira primero qué eventos están
// deshechos y luego reproduce el resto: el resultado es el mismo que si X no hubiera
// existido, en todos los equipos. Como cambia el pasado, deshacer recalcula todo
// (store/game.ts y features/snapshot), igual que un evento remoto antiguo.

import type { EventBody, GameEvent } from "../../domain/events";

/** Lo más que puede pasar entre un evento y deshacerlo: 15 minutos. Después, ya es historia. */
export const UNDO_WINDOW_MS = 15 * 60_000;

/**
 * Lo que se puede deshacer. No están completar (se volvería a tirar el cofre del botín),
 * cumplir encargos ni comprar (lo ganado y lo pagado no se deshacen), ni fallar.
 */
export const UNDOABLE: ReadonlySet<EventBody["type"]> = new Set<EventBody["type"]>([
  "quest_created",
  "quest_updated",
  "quest_accepted",
  "quest_abandoned",
  "quest_deleted",
  "temporal_created",
  "temporal_updated",
  "temporal_accepted",
  "temporal_postponed",
  "temporal_linked",
  "temporal_unlinked",
  "temporal_deleted",
  "agenda_created",
  "agenda_updated",
  "agenda_skipped",
  "agenda_deleted",
]);

export const isUndoable = (type: EventBody["type"]) => UNDOABLE.has(type);

/**
 * Ids de los eventos deshechos en un historial. Cuenta un `event_undone` si su evento
 * está en la lista, se puede deshacer y no han pasado más de UNDO_WINDOW_MS (ni va
 * antes de él). Deshacer dos veces el mismo evento es lo mismo que una.
 */
export function undoneIn(events: readonly GameEvent[]): Set<string> {
  const undone = new Set<string>();
  let byId: Map<string, GameEvent> | undefined;
  for (const e of events) {
    if (e.type !== "event_undone") continue;
    byId ??= new Map(events.map((x) => [x.id, x]));
    const target = byId.get(e.eventId);
    if (!target || !isUndoable(target.type)) continue;
    const gap = e.ts - target.ts;
    if (gap >= 0 && gap <= UNDO_WINDOW_MS) undone.add(target.id);
  }
  return undone;
}

/** ¿Hay algún deshacer en la lista? Si lo hay, hay que reproducirlo todo desde el principio. */
export const hasUndo = (events: readonly Pick<GameEvent, "type">[]) => events.some((e) => e.type === "event_undone");

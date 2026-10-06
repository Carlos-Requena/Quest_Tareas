// Casos de uso de deshacer: ofrecerlo en el aviso de una acción y deshacer con ⌘Z / Ctrl+Z.

import { useGame } from "../../store/game";
import type { GameEvent } from "../../domain/events";
import { sfx } from "../../lib/sfx";
import i18n from "../../i18n";
import { isUndoable, UNDO_WINDOW_MS } from "./model";

/** Lo que se ha hecho en esta sesión y aún se puede deshacer, del más antiguo al más reciente. */
const stack: { eventId: string; ts: number; text: () => string }[] = [];
const MAX_STACK = 30;

/** Aún dentro de la ventana, con un margen para que no caduque mientras se pulsa. */
const fresh = (ts: number) => Date.now() - ts < UNDO_WINDOW_MS - 5_000;

/**
 * Avisa de lo que se hizo con un botón «Deshacer». `text` es el aviso de siempre. Si el
 * evento no se puede deshacer (o no llegó a guardarse), es un aviso normal.
 */
export function offerUndo(e: GameEvent | undefined, text: () => string) {
  const { say } = useGame.getState();
  if (!e || !isUndoable(e.type)) return say(text);
  stack.push({ eventId: e.id, ts: e.ts, text });
  if (stack.length > MAX_STACK) stack.shift();
  say(text, { label: () => i18n.t("undo.action"), run: () => void undo(e.id) });
}

/** Deshace un evento de esta sesión. Devuelve si se pudo. */
export async function undo(eventId: string): Promise<boolean> {
  const i = stack.findIndex((x) => x.eventId === eventId);
  const entry = i >= 0 ? stack[i] : undefined;
  const { dispatch, say } = useGame.getState();
  if (!entry || !fresh(entry.ts)) {
    sfx.cancel();
    say(() => i18n.t("undo.expired"));
    return false;
  }
  stack.splice(i, 1);
  await dispatch({ type: "event_undone", eventId });
  sfx.page();
  say(() => i18n.t("undo.done", { what: entry.text() }));
  return true;
}

/** ⌘Z / Ctrl+Z: deshace lo último que se hizo en esta sesión (si no ha pasado demasiado). */
export async function undoLast(): Promise<boolean> {
  while (stack.length && !fresh(stack[stack.length - 1].ts)) stack.pop();
  const last = stack[stack.length - 1];
  if (!last) {
    sfx.cancel();
    useGame.getState().say(() => i18n.t("undo.nothing"));
    return false;
  }
  return undo(last.eventId);
}

/** Solo para los tests: vacía la pila. */
export const resetUndo = () => void stack.splice(0);

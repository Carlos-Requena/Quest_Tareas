// Versionado de los eventos. Los eventos guardados no se reescriben nunca: los de una
// versión anterior se convierten al leerlos (upcasting), paso a paso hasta EVENT_VERSION.

import { EVENT_VERSION, type GameEvent } from "./events";

type Step = (e: GameEvent) => GameEvent;

/** UPCASTERS[n] convierte un evento de la versión n a la n + 1. Hay uno por versión. */
export const UPCASTERS: readonly Step[] = [
  // 0 → 1: mismo formato; solo empieza a llevar `v`. Los formatos de antes de versionar
  // ya los convierten, por su forma, features/pomodoro/legacy.ts y features/items/legacy.ts.
  (e) => e,
];

/** Versión de un evento: los que no la llevan son anteriores a la 1. */
export const versionOf = (e: Pick<GameEvent, "v">) => e.v ?? 0;

/**
 * ¿Lo escribió una versión más nueva de la app? La proyección lo ignora: no sabe
 * interpretarlo. Al actualizar, PROJECTION_VERSION habrá subido y se aplicará.
 */
export const isFromFuture = (e: Pick<GameEvent, "v">) => versionOf(e) > EVENT_VERSION;

/** El evento en la versión actual. No modifica el original. */
export function upcastEvent(e: GameEvent): GameEvent {
  let v = versionOf(e);
  if (v >= EVENT_VERSION) return e;
  let out = e;
  for (; v < EVENT_VERSION; v++) out = UPCASTERS[v](out);
  return { ...out, v: EVENT_VERSION };
}

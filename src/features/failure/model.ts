// Modelo puro de los fallos: sin React, sin store, sin Tauri, sin DOM.
// El dominio (src/domain) importa SOLO model.ts y events.ts, nunca index.ts.
//
// Una quest con fecha límite que llega al final de su día sin completarse se FRACTURA;
// un encargo que llega al final de su día sin cumplirse se QUEMA. No cuesta oro ni XP:
// sale del tablón y queda en la crónica como fallido (se puede volver a clavar una copia).

import type { QuestState } from "../../domain/types";
import { recurs } from "../complex/model";
import { dateKey } from "../agenda/model";
import type { TemporalState } from "../temporal/model";

/**
 * Lo vencido antes de este día se perdona: falla solo lo que vence desde que existen los
 * fallos (6 de octubre de 2026). Lo anterior sigue como estaba y se resuelve a mano.
 */
export const FAIL_SINCE_DAY = "2026-10-06";

/** Fin del plazo: la medianoche local que cierra el día de la fecha (respeta el cambio de hora). */
export function failsAt(dueAt: number): number {
  const d = new Date(dueAt);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
}

/**
 * ¿Puede fracturarse ya? Sin terminar, con fecha límite propia, que no se repita y con su
 * día acabado. Es también la guarda de `quest_failed` (con `now` = ts del evento).
 */
export const questFailsBy = (q: Pick<QuestState, "status" | "dueAt" | "category" | "cooldownMinutes" | "repeatDays">, now: number): boolean =>
  q.status !== "done" && q.dueAt !== undefined && !recurs(q) && now >= failsAt(q.dueAt);

/** ¿Puede quemarse ya? Pendiente (aceptado o no) y con su día acabado. Guarda de `temporal_failed`. */
export const temporalFailsBy = (t: Pick<TemporalState, "status" | "dueAt">, now: number): boolean =>
  t.status === "pending" && now >= failsAt(t.dueAt);

/** ¿Entra en los fallos o se perdona por ser de antes (FAIL_SINCE_DAY)? */
export const notForgiven = (dueAt: number, sinceDay = FAIL_SINCE_DAY) => dateKey(dueAt) >= sinceDay;

/**
 * Lo que toca fallar en `now`: las quests y los encargos con el día acabado, sin los
 * perdonados. Las quests de un encargo que se quema van con él (no se listan aparte).
 */
export function dueFailures(
  src: { quests: Iterable<QuestState>; temporals: Iterable<TemporalState> },
  now: number,
  sinceDay = FAIL_SINCE_DAY,
): { quests: QuestState[]; temporals: TemporalState[] } {
  const temporals = [...src.temporals].filter((t) => temporalFailsBy(t, now) && notForgiven(t.dueAt, sinceDay));
  const burning = new Set(temporals.flatMap((t) => t.questIds));
  const quests = [...src.quests].filter((q) => questFailsBy(q, now) && notForgiven(q.dueAt!, sinceDay) && !burning.has(q.id));
  return { quests, temporals };
}

/** Lo que falló después de `since` (para enseñar la animación una vez en cada equipo). */
export function failedSince(
  src: { quests: Iterable<QuestState>; temporals: Iterable<TemporalState> },
  since: number,
): { quests: QuestState[]; temporals: TemporalState[] } {
  const temporals = [...src.temporals].filter((t) => (t.failedAt ?? -Infinity) > since).sort((a, b) => a.failedAt! - b.failedAt!);
  // Las quests que se quemaron con su encargo se ven en su cartel.
  const withPoster = new Set(temporals.flatMap((t) => t.questIds));
  const quests = [...src.quests].filter((q) => (q.failedAt ?? -Infinity) > since && !withPoster.has(q.id)).sort((a, b) => a.failedAt! - b.failedAt!);
  return { quests, temporals };
}

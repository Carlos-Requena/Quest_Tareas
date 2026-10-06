// Estado de cada quest enlazada a un encargo, para el formulario, el cartel y el tablón.
// Usa la proyección (effectiveStatus) y los requisitos, por eso no está en model.ts:
// model.ts lo importa el dominio y se crearía un ciclo.

import type { QuestState } from "../../domain/types";
import { effectiveStatus } from "../../domain/projection";
import { prerequisitesMet } from "../complex/model";
import { linkedQuestDone } from "./model";

/**
 * Terminada (para este encargo), en curso, bloqueada por requisitos, por aceptar, en espera,
 * en reserva (encargo sin aceptar) o perdida (se fracturó, features/failure).
 */
export type LinkState = "done" | "active" | "locked" | "available" | "cooldown" | "reserved" | "failed";

/** `since`: cuándo se enlazó (sin él, la quest aún no está enlazada: basta con que esté completada). */
export function linkState(q: QuestState, since: number | undefined, quests: Pick<Map<string, QuestState>, "get">, now: number): LinkState {
  if (q.failedAt !== undefined) return "failed";
  if (since === undefined ? q.status === "done" : linkedQuestDone(q, since)) return "done";
  if (q.reserved) return "reserved";
  const st = effectiveStatus(q, now);
  if (st === "active" || st === "cooldown") return st;
  if (st === "done") return "done";
  return prerequisitesMet(q, quests) ? "available" : "locked";
}

import type { QuestDef, RewardDef } from "./types";
import type { PomodoroEventBody } from "../features/pomodoro/events";
import type { ItemEventBody } from "../features/items/events";
import type { TemporalEventBody } from "../features/temporal/events";
import type { MerchantEventBody } from "../features/merchant/events";
import type { EquipmentEventBody } from "../features/equipment/events";
import type { ChecklistEventBody } from "../features/checklist/events";
import type { Drop } from "../features/items/model";

/**
 * Todo cambio de estado es un evento inmutable. El estado (quests, XP, nivel…)
 * se deriva siempre reproduciendo los eventos en orden, de modo que fusionar
 * los registros de varios dispositivos es simplemente unirlos por id.
 */
export type EventBody =
  | { type: "quest_created"; quest: QuestDef }
  | { type: "quest_deleted"; questId: string }
  | { type: "quest_accepted"; questId: string }
  | { type: "quest_abandoned"; questId: string }
  | {
      type: "progress_added";
      questId: string;
      conditionId: string;
      amount: number;
    }
  | {
      type: "quest_completed";
      questId: string;
      /** Copia de la recompensa: editar la quest después no cambia lo ganado. */
      reward: RewardDef;
      /** Drops aleatorios ya tirados (falta en los datos antiguos). */
      drops?: Drop[];
    }
  | PomodoroEventBody
  | ItemEventBody
  | TemporalEventBody
  | MerchantEventBody
  | EquipmentEventBody
  | ChecklistEventBody;

export interface EventMeta {
  id: string;
  deviceId: string;
  ts: number;
}

export type GameEvent = EventMeta & EventBody;

/** Posición de un evento en el orden de la proyección: primero `ts`, luego `id`. */
export type EventPos = Pick<EventMeta, "ts" | "id">;

export function comparePos(a: EventPos, b: EventPos): number {
  return a.ts - b.ts || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export const compareEvents: (a: GameEvent, b: GameEvent) => number = comparePos;

/** Margen en el que un reloj igual o algo atrasado se trata como «el mismo instante». */
export const SAME_MOMENT_MS = 1000;

/**
 * `ts` de un evento nuevo de este equipo. Los empates de `ts` se deshacen por `id`, que
 * es aleatorio: dos eventos del mismo milisegundo (una acción que emite varios) podrían
 * quedar al revés. Por eso, si el reloj no ha avanzado desde el último evento aplicado
 * (o va por detrás menos de SAME_MOMENT_MS), el nuevo va 1 ms después de él. Un retraso
 * mayor se deja como está: el evento cae en medio del historial y se recalcula todo.
 */
export function nextTs(now: number, last?: EventPos): number {
  return last && now <= last.ts && last.ts - now < SAME_MOMENT_MS ? last.ts + 1 : now;
}

import type { QuestDef, RewardDef } from "./types";
import type { PomodoroEventBody } from "../features/pomodoro/events";
import type { ItemEventBody } from "../features/items/events";
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
  | ItemEventBody;

export interface EventMeta {
  id: string;
  deviceId: string;
  ts: number;
}

export type GameEvent = EventMeta & EventBody;

export function compareEvents(a: GameEvent, b: GameEvent): number {
  return a.ts - b.ts || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

import type { QuestDef, RewardDef } from "./types";

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
  | { type: "quest_completed"; questId: string; reward: RewardDef };

export interface EventMeta {
  id: string;
  deviceId: string;
  ts: number;
}

export type GameEvent = EventMeta & EventBody;

export function compareEvents(a: GameEvent, b: GameEvent): number {
  return a.ts - b.ts || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

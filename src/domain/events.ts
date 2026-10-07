import type { QuestDef, RewardDef } from "./types";
import type { PomodoroEventBody } from "../features/pomodoro/events";
import type { ItemEventBody } from "../features/items/events";
import type { TemporalEventBody } from "../features/temporal/events";
import type { MerchantEventBody } from "../features/merchant/events";
import type { EquipmentEventBody } from "../features/equipment/events";
import type { ChecklistEventBody } from "../features/checklist/events";
import type { CollectibleEventBody } from "../features/collectibles/events";
import type { AgendaEventBody } from "../features/agenda/events";
import type { EditingEventBody } from "../features/editing/events";
import type { FailureEventBody } from "../features/failure/events";
import type { UndoEventBody } from "../features/undo/events";
import type { MenuEventBody } from "../features/menu/events";
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
  | ChecklistEventBody
  | CollectibleEventBody
  | AgendaEventBody
  | EditingEventBody
  | FailureEventBody
  | UndoEventBody
  | MenuEventBody;

/**
 * Versión del formato de los eventos que escribe esta app. NORMA: si cambias la forma
 * de un evento, súbela, añade el paso en UPCASTERS (domain/upcast.ts) y sube también
 * PROJECTION_VERSION (los equipos que ignoraban esos eventos tienen que recalcular).
 */
export const EVENT_VERSION = 1;

export interface EventMeta {
  id: string;
  deviceId: string;
  /** Marca del reloj lógico híbrido (ver nextTs): milisegundos, nunca hacia atrás en un equipo. */
  ts: number;
  /** Versión del formato (EVENT_VERSION al escribirlo). Falta en los anteriores a la 1: cuentan como 0. */
  v?: number;
}

export type GameEvent = EventMeta & EventBody;

/** Posición de un evento en el orden de la proyección: primero `ts`, luego `id`. */
export type EventPos = Pick<EventMeta, "ts" | "id">;

export function comparePos(a: EventPos, b: EventPos): number {
  return a.ts - b.ts || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export const compareEvents: (a: GameEvent, b: GameEvent) => number = comparePos;

/**
 * Lo más que el reloj de este equipo sigue a un evento que va por delante de él. Un
 * minuto: menos que la precisión de las esperas y los pomodoros, que se muestran en minutos.
 */
export const MAX_DRIFT_MS = 60_000;

/**
 * `ts` de un evento nuevo de este equipo: un reloj lógico híbrido (HLC) con el contador
 * dentro de los milisegundos, así que el formato de los eventos no cambia.
 *
 * - Evento local: max(reloj, último + 1). Dos eventos del mismo milisegundo (una acción
 *   que emite varios) no se reordenan por su `id` aleatorio.
 * - Evento recibido: `last` es el último aplicado, también los fusionados de otros equipos.
 *   Lo que se hace después de ver un evento va siempre detrás de él, aunque el reloj de
 *   este equipo vaya atrasado.
 * - Deriva: si `last` va más de MAX_DRIFT_MS por delante del reloj (un equipo con la hora
 *   mal, un cambio de hora a mano), no se le sigue: se usa el reloj, el evento cae en medio
 *   del historial y se recalcula todo. Así un reloj del año 2099 no arrastra a los demás.
 *
 * El orden total es (ts, id) en todos los equipos, así que todos llegan al mismo estado.
 */
export function nextTs(now: number, last?: EventPos): number {
  return last && now <= last.ts && last.ts - now <= MAX_DRIFT_MS ? last.ts + 1 : now;
}

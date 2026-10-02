import type { Pomodoro, PomodoroConfig } from "../features/pomodoro/model";
import type { ItemDef, Pity } from "../features/items/model";
import type { TemporalState } from "../features/temporal/model";

export type Category = "elite" | "repeat" | "request";

/** Objetivo con contador: «Leer páginas ×20». `kind` falta en los datos antiguos. */
export interface CountConditionDef {
  id: string;
  kind?: "count";
  label: string;
  target: number;
}

/**
 * Objetivo de pomodoro: `target` rondas de concentración con su descanso entre
 * ellas; la última ronda no tiene descanso porque la tarea ya ha terminado.
 */
export interface PomodoroConditionDef extends PomodoroConfig {
  id: string;
  kind: "pomodoro";
  label: string;
  /** Número de rondas. */
  target: number;
}

/** Un objetivo de la quest es de uno de estos tipos. */
export type ConditionDef = CountConditionDef | PomodoroConditionDef;

export const isPomodoroCondition = (c: ConditionDef): c is PomodoroConditionDef => c.kind === "pomodoro";

export interface RewardDef {
  xp: number;
  gold: number;
  /** Objeto garantizado del almanaque. Los datos antiguos traían `item` (texto): ver features/items/legacy.ts. */
  itemId?: string;
}

/** Definición inmutable de una quest (lo que se crea en el tablón). */
export interface QuestDef {
  id: string;
  title: string;
  category: Category;
  description: string;
  client: string;
  area: string;
  kind: string;
  conditions: ConditionDef[];
  reward: RewardDef;
  /** Solo para repetibles: minutos hasta que vuelve a estar disponible. */
  cooldownMinutes?: number;
  createdAt: number;
}

export type QuestStatus = "available" | "active" | "cooldown" | "done";

export interface QuestState extends QuestDef {
  status: QuestStatus;
  /** Progreso de las condiciones de contador, por id de condición. */
  progress: Record<string, number>;
  /** Estado de cada condición de pomodoro, por id de condición (composición 1 a 1). */
  pomodoros: Record<string, Pomodoro>;
  acceptedAt?: number;
  availableAt?: number;
  completions: number;
}

export interface PlayerState {
  xp: number;
  gold: number;
  level: number;
  /** XP acumulada dentro del nivel actual. */
  levelXp: number;
  /** XP necesaria para pasar del nivel actual al siguiente. */
  levelXpNeeded: number;
  rank: string;
  maxActive: number;
  /** Inventario: unidades de cada objeto, por id. */
  inventory: Record<string, number>;
  /** Primera vez que se obtuvo cada objeto (ms), por id. */
  discovered: Record<string, number>;
  /** Tiradas desde el último legendario y desde el último épico o superior. */
  pity: Pity;
  completedCount: number;
}

export interface GameState {
  quests: Map<string, QuestState>;
  /** Almanaque: todos los objetos que existen, conseguidos o no. */
  items: Map<string, ItemDef>;
  /** Encargos temporales (citas, entregas, eventos con fecha), en su propio tablón. */
  temporals: Map<string, TemporalState>;
  player: PlayerState;
}

/** Presentación de cada categoría. El nombre traducido está en el diccionario (`category.*`). */
export const CATEGORY_META: Record<Category, { tag: string; color: string }> = {
  elite: { tag: "ELITE", color: "var(--elite)" },
  repeat: { tag: "REPEAT", color: "var(--repeat)" },
  request: { tag: "REQUEST", color: "var(--request)" },
};

import type { Pomodoro, PomodoroConfig } from "../features/pomodoro/model";
import type { ItemDef, Pity } from "../features/items/model";
import type { TemporalState } from "../features/temporal/model";
import type { GearDef, Purchase } from "../features/merchant/model";
import type { Equipped } from "../features/equipment/model";
import type { Attribute } from "../features/attributes/model";
import type { Checked, ChecklistConditionDef } from "../features/checklist/model";
import type { Streak } from "../features/streaks/model";
import type { ChronicleAcc } from "../features/chronicle/model";

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

/** Un objetivo de la quest es de uno de estos tipos (la lista: features/checklist). */
export type ConditionDef = CountConditionDef | PomodoroConditionDef | ChecklistConditionDef;

export const isPomodoroCondition = (c: ConditionDef): c is PomodoroConditionDef => c.kind === "pomodoro";
/** Contador: el tipo por defecto (`kind` falta en los datos antiguos). */
export const isCountCondition = (c: ConditionDef): c is CountConditionDef => c.kind === undefined || c.kind === "count";

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
  /**
   * Repetición: minutos hasta que vuelve a estar disponible tras completarla. Las
   * repetibles siempre vuelven; las demás, solo si lo tienen (features/complex).
   */
  cooldownMinutes?: number;
  /** Requisitos: quests que hay que completar antes de poder aceptar esta (features/complex). */
  requires?: string[];
  /** Fecha límite opcional, todo el día: medianoche local de ese día (features/horizon). */
  dueAt?: number;
  createdAt: number;
}

export type QuestStatus = "available" | "active" | "cooldown" | "done";

export interface QuestState extends QuestDef {
  status: QuestStatus;
  /** Progreso de las condiciones de contador, por id de condición. */
  progress: Record<string, number>;
  /** Estado de cada condición de pomodoro, por id de condición (composición 1 a 1). */
  pomodoros: Record<string, Pomodoro>;
  /** Casillas marcadas de cada objetivo de tipo lista, por id de condición (features/checklist). */
  checked: Checked;
  acceptedAt?: number;
  availableAt?: number;
  completions: number;
  /** Última vez que se completó (ts del evento). */
  lastCompletedAt?: number;
  /** Encargo temporal pendiente al que pertenece, si lo hay (calculado a partir de sus enlaces). */
  temporalId?: string;
  /** Racha de las quests que se repiten: veces seguidas a tiempo (features/streaks). */
  streak?: Streak;
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
  /** Equipo y decoración comprados al mercader, por id de pieza (features/merchant). */
  owned: Record<string, Purchase>;
  /** Lo que lleva puesto el muñeco y la decoración del menú, por ranura (features/equipment). */
  equipped: Equipped;
  /** Atributos: uno por área de las quests, de más a menos XP (features/attributes). */
  attributes: Attribute[];
}

export interface GameState {
  quests: Map<string, QuestState>;
  /** Almanaque: todos los objetos que existen, conseguidos o no. */
  items: Map<string, ItemDef>;
  /** Encargos temporales (citas, entregas, eventos con fecha), en su propio tablón. */
  temporals: Map<string, TemporalState>;
  /** Catálogo del mercader: las piezas de serie (features/armory) y las del jugador (features/merchant). */
  gear: Map<string, GearDef>;
  /** Crónica del aventurero: lo que ha pasado, en orden (features/chronicle). */
  chronicle: ChronicleAcc;
  player: PlayerState;
}

/** Recompensa propuesta para una quest nueva de cada categoría (formulario y quests de un encargo). */
export const DEFAULT_REWARD: Record<Category, { xp: number; gold: number }> = {
  elite: { xp: 400, gold: 200 },
  repeat: { xp: 100, gold: 50 },
  request: { xp: 150, gold: 80 },
};

/** Presentación de cada categoría. El nombre traducido está en el diccionario (`category.*`). */
export const CATEGORY_META: Record<Category, { tag: string; color: string }> = {
  elite: { tag: "ELITE", color: "var(--elite)" },
  repeat: { tag: "REPEAT", color: "var(--repeat)" },
  request: { tag: "REQUEST", color: "var(--request)" },
};

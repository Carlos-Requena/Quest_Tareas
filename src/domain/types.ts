export type Category = "elite" | "repeat" | "request";

export interface ConditionDef {
  id: string;
  label: string;
  target: number;
}

export interface RewardDef {
  xp: number;
  gold: number;
  item?: string;
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
  progress: Record<string, number>;
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
  items: Record<string, number>;
  completedCount: number;
}

export interface GameState {
  quests: Map<string, QuestState>;
  player: PlayerState;
}

export const CATEGORY_META: Record<
  Category,
  { label: string; tag: string; color: string }
> = {
  elite: { label: "Élite", tag: "ELITE", color: "var(--elite)" },
  repeat: { label: "Repetible", tag: "REPEAT", color: "var(--repeat)" },
  request: { label: "Encargo", tag: "REQUEST", color: "var(--request)" },
};

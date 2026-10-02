import type { EventBody } from "./events";
import type { Category, ConditionDef, RewardDef } from "./types";
import type { PomodoroConfig } from "../features/pomodoro/model";
import type { ItemDef, Rarity } from "../features/items/model";
import { currentLang, locales } from "../i18n";

type SeedKey = keyof (typeof locales)["es"]["seed"];
type ItemKey = keyof (typeof locales)["es"]["items"]["seed"];

/** Almanaque inicial: al menos un objeto de cada rareza para que los drops tengan dónde caer. */
const SEED_ITEMS: { key: ItemKey; rarity: Rarity }[] = [
  { key: "scroll", rarity: "common" },
  { key: "ingredients", rarity: "common" },
  { key: "potion", rarity: "common" },
  { key: "bookmark", rarity: "uncommon" },
  { key: "seal", rarity: "uncommon" },
  { key: "hourglass", rarity: "rare" },
  { key: "feather", rarity: "rare" },
  { key: "tome", rarity: "epic" },
  { key: "scale", rarity: "mythic" },
  { key: "crown", rarity: "legendary" },
];

/** Datos numéricos de las quests de ejemplo; los textos salen del idioma activo. */
const SEED: {
  key: SeedKey;
  category: Category;
  /** Por objetivo: un número (contador) o un pomodoro con sus rondas. */
  conds: (number | (PomodoroConfig & { rounds: number }))[];
  reward: Omit<RewardDef, "itemId">;
  /** Objeto garantizado (de SEED_ITEMS). */
  item?: ItemKey;
  cooldownMinutes?: number;
}[] = [
  { key: "dragon", category: "elite", conds: [1, 3], reward: { xp: 400, gold: 250 }, item: "seal" },
  { key: "tower", category: "elite", conds: [{ rounds: 5, focusMinutes: 50, breakMinutes: 10 }], reward: { xp: 500, gold: 300 }, item: "feather" },
  { key: "gym", category: "repeat", conds: [1, 1], reward: { xp: 120, gold: 60 }, item: "potion", cooldownMinutes: 20 * 60 },
  { key: "library", category: "repeat", conds: [20], reward: { xp: 80, gold: 40 }, cooldownMinutes: 20 * 60 },
  { key: "market", category: "request", conds: [3, 3], reward: { xp: 150, gold: 80 }, item: "ingredients" },
];

/**
 * Ids fijos para los datos de ejemplo: si dos equipos arrancan vacíos y luego se
 * sincronizan (features/sync), sus ejemplos se juntan en uno (la proyección ignora
 * crear algo que ya existe o que se retiró) en vez de salir dos veces.
 */
export const seedQuestId = (key: string) => `seed:quest:${key}`;
export const seedItemId = (key: string) => `seed:item:${key}`;

export function seedEvents(): EventBody[] {
  const now = Date.now();
  const lang = locales[currentLang()];
  const texts = lang.seed;

  const items = new Map<ItemKey, ItemDef>(
    SEED_ITEMS.map((it, i) => {
      const tx = lang.items.seed[it.key];
      return [it.key, { id: seedItemId(it.key), name: tx.name, rarity: it.rarity, kind: tx.kind, description: tx.description, droppable: true, createdAt: now + i }];
    }),
  );
  const itemEvents: EventBody[] = [...items.values()].map((item) => ({ type: "item_created", item }));

  const questEvents = SEED.map((s, i): EventBody => {
    const tx = texts[s.key];
    return {
      type: "quest_created",
      quest: {
        id: seedQuestId(s.key),
        title: tx.title,
        category: s.category,
        client: tx.client,
        area: tx.area,
        kind: tx.kind,
        description: tx.description,
        conditions: s.conds.map(
          (spec, c): ConditionDef =>
            typeof spec === "number"
              ? { id: `${seedQuestId(s.key)}:c${c}`, kind: "count", label: tx.conditions[c], target: spec }
              : {
                  id: `${seedQuestId(s.key)}:c${c}`,
                  kind: "pomodoro",
                  label: tx.conditions[c],
                  target: spec.rounds,
                  focusMinutes: spec.focusMinutes,
                  breakMinutes: spec.breakMinutes,
                },
        ),
        reward: { ...s.reward, itemId: s.item && items.get(s.item)?.id },
        cooldownMinutes: s.cooldownMinutes,
        createdAt: now + i,
      },
    };
  });
  return [...itemEvents, ...questEvents];
}

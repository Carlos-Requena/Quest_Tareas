// Recompensa calculada: cuánto valen una quest y un encargo temporal según el
// esfuerzo de sus objetivos. Modelo puro: sin React, sin store, sin Tauri.
import type { Category, ConditionDef, RewardDef } from "../../domain/types";
import { isCountCondition, isPomodoroCondition } from "../../domain/types";
import { isChecklistCondition } from "../checklist/model";
import { clampSkulls, suggestedReward } from "../temporal/model";

export interface Reward {
  xp: number;
  gold: number;
}

/**
 * Lo que aporta cada tipo de objetivo:
 * - pomodoro: por minuto de concentración (las rondas cuentan; los descansos, no);
 * - contador: con la raíz de la cantidad, para que un «×999» no rompa la economía;
 * - lista: por casilla.
 *
 * El oro está calibrado para comprar a menudo: un día bueno (4–5 h de concentración)
 * da unos 6.500 G, y con días así el catálogo de serie entero (unos 2,36 millones
 * de G) se compra en un año. Una legendaria cuesta 2–3 semanas.
 */
export const REWARD_RATES = {
  pomodoro: { xpPerMinute: 1, goldPerMinute: 18 },
  count: { xp: 25, gold: 450 },
  checklist: { xpPerItem: 15, goldPerItem: 270 },
} as const;

/**
 * El oro de la base de un encargo (`suggestedReward`, de 30 a 250 G) se multiplica
 * por esto, para ir al ritmo del de las quests.
 */
export const TEMPORAL_GOLD_FACTOR = 45;

/** Peso de la categoría: las élite son metas grandes y las repetibles vuelven cada poco. */
export const CATEGORY_FACTOR: Record<Category, number> = { elite: 2, request: 1, repeat: 0.5 };

/** Bono de un encargo sobre lo que valen sus quests: 20 % con 1 calavera y un 10 % más por cada una (60 % con 5). */
export const temporalBonusRate = (skulls: number) => 0.2 + 0.1 * (clampSkulls(skulls) - 1);

/** Redondeo a 5, para que las cifras se lean bien en el tablón. */
const round5 = (n: number) => Math.round(n / 5) * 5;

const positive = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/** Lo que aporta un objetivo, sin redondear ni aplicar la categoría. */
export function conditionValue(c: ConditionDef): Reward {
  if (isPomodoroCondition(c)) {
    const minutes = positive(c.target) * positive(c.focusMinutes);
    return { xp: minutes * REWARD_RATES.pomodoro.xpPerMinute, gold: minutes * REWARD_RATES.pomodoro.goldPerMinute };
  }
  if (isChecklistCondition(c)) {
    const n = Array.isArray(c.items) ? c.items.length : positive(c.target);
    return { xp: n * REWARD_RATES.checklist.xpPerItem, gold: n * REWARD_RATES.checklist.goldPerItem };
  }
  if (isCountCondition(c)) {
    const root = Math.sqrt(positive(c.target));
    return { xp: root * REWARD_RATES.count.xp, gold: root * REWARD_RATES.count.gold };
  }
  return { xp: 0, gold: 0 };
}

/** XP y oro de una quest: la suma de sus objetivos por el peso de su categoría, redondeado a 5. */
export function questValue(q: { category: Category; conditions: ConditionDef[] }): Reward {
  const f = CATEGORY_FACTOR[q.category] ?? 1;
  let xp = 0;
  let gold = 0;
  for (const c of q.conditions) {
    const v = conditionValue(c);
    xp += v.xp;
    gold += v.gold;
  }
  return { xp: round5(xp * f), gold: round5(gold * f) };
}

/** Recompensa completa de una quest: la calculada, conservando su objeto garantizado. */
export const questReward = (q: { category: Category; conditions: ConditionDef[]; reward?: RewardDef }): RewardDef => {
  const v = questValue(q);
  return q.reward?.itemId ? { ...v, itemId: q.reward.itemId } : v;
};

/**
 * Recompensa de un encargo: la base de sus calaveras (`suggestedReward`, de 60 a 500 XP;
 * el oro, por `TEMPORAL_GOLD_FACTOR`) más un bono sobre lo que valen
 * sus quests enlazadas. Las quests pagan lo suyo al completarlas; el encargo premia
 * cerrarlo todo.
 */
export function temporalValue(skulls: number, linked: Iterable<Reward>): Reward {
  const base = suggestedReward(skulls);
  let xp = 0;
  let gold = 0;
  for (const r of linked) {
    xp += positive(r.xp);
    gold += positive(r.gold);
  }
  const rate = temporalBonusRate(skulls);
  return { xp: base.xp + round5(xp * rate), gold: base.gold * TEMPORAL_GOLD_FACTOR + round5(gold * rate) };
}

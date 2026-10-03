import { describe, expect, it } from "vitest";
import { project } from "../../domain/projection";
import type { ConditionDef } from "../../domain/types";
import { questDef, T0, temporalDef } from "../../test/streams";
import { conditionValue, questReward, questValue, temporalBonusRate, temporalValue } from "./model";

const count = (target: number): ConditionDef => ({ id: `c${target}`, kind: "count", label: "x", target });
const pomo = (rounds: number, focusMinutes: number): ConditionDef => ({ id: "p", kind: "pomodoro", label: "x", target: rounds, focusMinutes, breakMinutes: 10 });
const list = (n: number): ConditionDef => ({
  id: "l",
  kind: "checklist",
  label: "x",
  target: n,
  items: Array.from({ length: n }, (_, i) => ({ id: `i${i}`, text: `${i}` })),
});

describe("lo que aporta cada objetivo", () => {
  it("pomodoro: por minuto de concentración, sin contar los descansos", () => {
    expect(conditionValue(pomo(3, 90))).toEqual({ xp: 270, gold: 4860 });
    expect(conditionValue(pomo(1, 25))).toEqual({ xp: 25, gold: 450 });
  });

  it("contador: con la raíz de la cantidad, para que un ×999 no rompa la economía", () => {
    expect(conditionValue(count(1))).toEqual({ xp: 25, gold: 450 });
    expect(conditionValue(count(9))).toEqual({ xp: 75, gold: 1350 });
    expect(conditionValue(count(100))).toEqual({ xp: 250, gold: 4500 });
  });

  it("lista: por casilla", () => {
    expect(conditionValue(list(4))).toEqual({ xp: 60, gold: 1080 });
  });

  it("valores imposibles no dan nada (ni restan)", () => {
    expect(conditionValue(count(-5))).toEqual({ xp: 0, gold: 0 });
    expect(conditionValue(pomo(Number.NaN, 25))).toEqual({ xp: 0, gold: 0 });
  });
});

describe("recompensa de una quest", () => {
  it("suma sus objetivos, aplica la categoría y redondea a 5", () => {
    const conditions = [pomo(3, 90), count(9)];
    expect(questValue({ category: "request", conditions })).toEqual({ xp: 345, gold: 6210 });
    expect(questValue({ category: "elite", conditions })).toEqual({ xp: 690, gold: 12420 });
    expect(questValue({ category: "repeat", conditions })).toEqual({ xp: 175, gold: 3105 });
  });

  it("conserva el objeto garantizado y descarta la XP y el oro escritos a mano", () => {
    expect(questReward({ category: "request", conditions: [count(1)], reward: { xp: 9999, gold: 9999, itemId: "seal" } })).toEqual({
      xp: 25,
      gold: 450,
      itemId: "seal",
    });
  });

  it("la proyección la calcula al crear la quest, también en datos antiguos", () => {
    const s = project([
      { id: "a", deviceId: "d", ts: T0, type: "quest_created", quest: questDef("q", { conditions: [pomo(2, 50)], reward: { xp: 400, gold: 200 } }) },
    ]);
    expect(s.quests.get("q")?.reward).toEqual({ xp: 100, gold: 1800 });
  });

  it("lo ya ganado no cambia: cuenta la recompensa copiada en quest_completed", () => {
    const s = project([
      { id: "a", deviceId: "d", ts: T0, type: "quest_created", quest: questDef("q", { conditions: [count(1)] }) },
      { id: "b", deviceId: "d", ts: T0 + 1, type: "quest_accepted", questId: "q" },
      { id: "c", deviceId: "d", ts: T0 + 2, type: "progress_added", questId: "q", conditionId: "c1", amount: 1 },
      { id: "d", deviceId: "d", ts: T0 + 3, type: "quest_completed", questId: "q", reward: { xp: 400, gold: 200 } },
    ]);
    expect(s.player.xp).toBe(400);
    expect(s.player.gold).toBe(200);
  });
});

describe("recompensa de un encargo temporal", () => {
  it("bono del 20 % con 1 calavera y un 10 % más por cada una", () => {
    expect([1, 2, 3, 4, 5].map((n) => Math.round(temporalBonusRate(n) * 100))).toEqual([20, 30, 40, 50, 60]);
    expect(temporalBonusRate(99)).toBeCloseTo(0.6);
  });

  it("base por calaveras más el bono sobre sus quests", () => {
    // El oro de la base va por TEMPORAL_GOLD_FACTOR (×45).
    expect(temporalValue(1, [])).toEqual({ xp: 60, gold: 1350 });
    expect(temporalValue(5, [{ xp: 300, gold: 120 }, { xp: 100, gold: 40 }])).toEqual({ xp: 740, gold: 11345 });
  });

  it("la proyección la recalcula al enlazar y desenlazar quests, y lo cumplido no cambia", () => {
    const base = [
      { id: "a", deviceId: "d", ts: T0, type: "quest_created" as const, quest: questDef("q", { conditions: [pomo(4, 50)] }) },
      { id: "b", deviceId: "d", ts: T0 + 1, type: "temporal_created" as const, temporal: temporalDef("t", { difficulty: 2, reward: { xp: 1, gold: 1 } }) },
    ];
    expect(project(base).temporals.get("t")?.reward).toEqual({ xp: 120, gold: 2700 });
    const linked = [...base, { id: "c", deviceId: "d", ts: T0 + 2, type: "temporal_linked" as const, temporalId: "t", questId: "q" }];
    // 4 × 50 min = 200 XP y 3.600 G; 30 % con 2 calaveras.
    expect(project(linked).temporals.get("t")?.reward).toEqual({ xp: 180, gold: 3780 });
    const unlinked = [...linked, { id: "e", deviceId: "d", ts: T0 + 3, type: "temporal_unlinked" as const, temporalId: "t", questId: "q" }];
    expect(project(unlinked).temporals.get("t")?.reward).toEqual({ xp: 120, gold: 2700 });
  });
});

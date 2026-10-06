import { describe, expect, it } from "vitest";
import { blockers, cleanRequires, dependents, isLocked, prerequisitesMet, recurrenceMinutes, recurs, requirementCandidates, splitMinutes, unlockedBetween } from "./model";
import { effectiveStatus, project } from "../../domain/projection";
import { at, HOUR, MIN, questDef, T0, withMeta } from "../../test/streams";
import type { EventBody } from "../../domain/events";

const done = (id: string): EventBody[] => [
  { type: "quest_accepted", questId: id },
  { type: "quest_completed", questId: id, reward: { xp: 10, gold: 1 } },
];

describe("repetición", () => {
  it("vuelven las repetibles siempre y las demás solo con repetición", () => {
    expect(recurs({ category: "repeat" })).toBe(true);
    expect(recurs({ category: "request" })).toBe(false);
    expect(recurs({ category: "elite", cooldownMinutes: 60 })).toBe(true);
    expect(recurs({ category: "elite", cooldownMinutes: 0 })).toBe(false);
  });

  it("recurrenceMinutes y splitMinutes van y vuelven, dentro de 1 hora y 1 año", () => {
    expect(recurrenceMinutes(3, "days")).toBe(3 * 24 * 60);
    expect(recurrenceMinutes(0, "hours")).toBe(60);
    expect(recurrenceMinutes(9999, "weeks")).toBe(365 * 24 * 60);
    expect(splitMinutes(3 * 24 * 60)).toEqual({ count: 3, unit: "days" });
    expect(splitMinutes(14 * 24 * 60)).toEqual({ count: 2, unit: "weeks" });
    expect(splitMinutes(20 * 60)).toEqual({ count: 20, unit: "hours" });
  });

  it("una élite con repetición vuelve al tablón cuando vence la espera, sin eventos", () => {
    const ev = [
      at(T0, { type: "quest_created", quest: questDef("e", { category: "elite", cooldownMinutes: 60 }) }),
      at(T0 + MIN, { type: "quest_accepted", questId: "e" }),
      at(T0 + 2 * MIN, { type: "quest_completed", questId: "e", reward: { xp: 400, gold: 1 } }),
    ];
    const q = project(ev).quests.get("e")!;
    expect(q).toMatchObject({ status: "cooldown", availableAt: T0 + 62 * MIN, completions: 1, lastCompletedAt: T0 + 2 * MIN });
    expect(effectiveStatus(q, T0 + 61 * MIN)).toBe("cooldown");
    expect(effectiveStatus(q, T0 + 62 * MIN)).toBe("available");
  });

  it("aceptarla antes de que venza la espera se ignora; después, vale y la vuelve a cobrar", () => {
    const base = [
      at(T0, { type: "quest_created", quest: questDef("r", { category: "repeat", cooldownMinutes: 60 }) }),
      at(T0 + MIN, { type: "quest_accepted", questId: "r" }),
      at(T0 + 2 * MIN, { type: "quest_completed", questId: "r", reward: { xp: 100, gold: 1 } }),
    ];
    const early = project([...base, at(T0 + 30 * MIN, { type: "quest_accepted", questId: "r" })]);
    expect(early.quests.get("r")?.status).toBe("cooldown");
    const late = project([
      ...base,
      at(T0 + 2 * HOUR, { type: "quest_accepted", questId: "r" }),
      at(T0 + 3 * HOUR, { type: "quest_completed", questId: "r", reward: { xp: 100, gold: 1 } }),
    ]);
    expect(late.player.xp).toBe(200);
    expect(late.quests.get("r")?.completions).toBe(2);
  });

  it("abandonar una repetida antes de que acabe su espera la devuelve a la espera", () => {
    const st = project([
      at(T0, { type: "quest_created", quest: questDef("r", { category: "repeat", cooldownMinutes: 60 }) }),
      at(T0 + MIN, { type: "quest_accepted", questId: "r" }),
      at(T0 + 2 * MIN, { type: "quest_completed", questId: "r", reward: { xp: 1, gold: 1 } }),
      at(T0 + 2 * HOUR, { type: "quest_accepted", questId: "r" }),
      at(T0 + 3 * HOUR, { type: "quest_abandoned", questId: "r" }),
    ]);
    // La espera (hasta T0 + 62 min) ya venció: vuelve a estar disponible.
    expect(st.quests.get("r")?.status).toBe("available");
  });
});

describe("requisitos", () => {
  it("cleanRequires quita duplicados, la propia quest y lo que pase de 6", () => {
    expect(cleanRequires({ id: "a", requires: ["b", "b", "a", "", "c"] })).toEqual(["b", "c"]);
    expect(cleanRequires({ id: "a", requires: ["1", "2", "3", "4", "5", "6", "7"] })).toHaveLength(6);
    expect(cleanRequires({ id: "a", requires: [] })).toBeUndefined();
    expect(cleanRequires({ id: "a" })).toBeUndefined();
  });

  it("no se puede aceptar hasta completar los requisitos, tampoco desde otro dispositivo", () => {
    const create: EventBody[] = [
      { type: "quest_created", quest: questDef("a") },
      { type: "quest_created", quest: questDef("b", { requires: ["a"] }) },
    ];
    const blocked = project(withMeta([...create, { type: "quest_accepted", questId: "b" }]));
    expect(blocked.quests.get("b")?.status).toBe("available");
    expect(isLocked(blocked.quests.get("b")!, blocked.quests)).toBe(true);
    expect(blockers(blocked.quests.get("b")!, blocked.quests).map((q) => q.id)).toEqual(["a"]);

    const open = project(withMeta([...create, ...done("a"), { type: "quest_accepted", questId: "b" }]));
    expect(open.quests.get("b")?.status).toBe("active");
  });

  it("un requisito retirado deja de bloquear", () => {
    const st = project(
      withMeta([
        { type: "quest_created", quest: questDef("a") },
        { type: "quest_created", quest: questDef("b", { requires: ["a", "fantasma"] }) },
        { type: "quest_deleted", questId: "a" },
      ]),
    );
    expect(prerequisitesMet(st.quests.get("b")!, st.quests)).toBe(true);
  });

  it("unlockedBetween avisa de lo que se desbloquea al completar", () => {
    const create: EventBody[] = [
      { type: "quest_created", quest: questDef("a") },
      { type: "quest_created", quest: questDef("b", { requires: ["a"] }) },
      { type: "quest_created", quest: questDef("c", { requires: ["a", "x"] }) },
      { type: "quest_created", quest: questDef("x") },
    ];
    const before = project(withMeta(create)).quests;
    const after = project(withMeta([...create, ...done("a")])).quests;
    expect(unlockedBetween(before, after).map((q) => q.id)).toEqual(["b"]);
    expect(dependents("a", after.values()).map((q) => q.id)).toEqual(["b", "c"]);
    expect(requirementCandidates(after.values()).map((q) => q.id)).toEqual(["b", "c", "x"]);
  });
});

describe("repetición por días de la semana", () => {
  // Lunes 5 de octubre de 2026, en la hora local (Europe/Madrid en los tests).
  const MON = new Date(2026, 9, 5, 18).getTime();
  const days = [1, 3, 5]; // lunes, miércoles y viernes

  it("limpia los días: de 0 a 6, sin repetir y en orden", async () => {
    const { cleanRepeatDays } = await import("./model");
    expect(cleanRepeatDays([5, 1, 9, 1, -1, 2.5])).toEqual([1, 5]);
    expect(cleanRepeatDays([])).toBeUndefined();
    expect(cleanRepeatDays("lunes")).toBeUndefined();
  });

  it("vuelve a medianoche del siguiente día que toca y la racha dura hasta que acaba ese día", async () => {
    const { nextRepeatDay, returnsAt, streakUntil } = await import("./model");
    expect(nextRepeatDay(MON, days)).toBe(new Date(2026, 9, 7).getTime());
    // Viernes → lunes siguiente.
    expect(nextRepeatDay(new Date(2026, 9, 9, 22).getTime(), days)).toBe(new Date(2026, 9, 12).getTime());
    // Solo un día: la semana siguiente.
    expect(nextRepeatDay(MON, [1])).toBe(new Date(2026, 9, 12).getTime());
    expect(returnsAt({ repeatDays: days, cooldownMinutes: 60 }, MON)).toBe(new Date(2026, 9, 7).getTime());
    expect(returnsAt({ cooldownMinutes: 60 }, MON)).toBe(MON + HOUR);
    expect(streakUntil({ repeatDays: days }, MON)).toBe(new Date(2026, 9, 8).getTime());
    expect(streakUntil({}, MON)).toBeUndefined();
    expect(recurs({ category: "request", repeatDays: [2] })).toBe(true);
  });

  it("en la proyección: completada el lunes, en espera hasta el miércoles y con racha", () => {
    const evs = [
      at(MON - HOUR, { type: "quest_created", quest: questDef("g", { repeatDays: [3, 1, 5, 8] }) }),
      at(MON, { type: "quest_accepted", questId: "g" }),
      at(MON + 1, { type: "quest_completed", questId: "g", reward: { xp: 10, gold: 1 } }),
      at(new Date(2026, 9, 7, 9).getTime(), { type: "quest_accepted", questId: "g" }),
      at(new Date(2026, 9, 7, 10).getTime(), { type: "quest_completed", questId: "g", reward: { xp: 10, gold: 1 } }),
    ];
    const g1 = project(evs.slice(0, 3)).quests.get("g")!;
    expect(g1.repeatDays).toEqual([1, 3, 5]);
    expect(g1.status).toBe("cooldown");
    expect(g1.availableAt).toBe(new Date(2026, 9, 7).getTime());
    expect(effectiveStatus(g1, new Date(2026, 9, 6, 23).getTime())).toBe("cooldown");
    const g2 = project(evs).quests.get("g")!;
    expect(g2.streak?.count).toBe(2);
    expect(g2.availableAt).toBe(new Date(2026, 9, 9).getTime());
  });
});

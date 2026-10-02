import { describe, expect, it } from "vitest";
import { project } from "../../domain/projection";
import { DAY, HOUR, questDef, T0 } from "../../test/streams";
import type { GameEvent } from "../../domain/events";
import { isStreakMilestone, liveStreak, nextStreak, streakAtRisk, streakDeadline } from "./model";

const DAILY = 20 * 60; // 20 h

describe("modelo", () => {
  it("una diaria hecha a las 8 sigue viva hasta las 4 del día después del siguiente", () => {
    expect(streakDeadline(T0, DAILY)).toBe(T0 + 20 * HOUR + DAY);
    // Sin espera: un día de margen.
    expect(streakDeadline(T0, 0)).toBe(T0 + DAY);
    // Semanal: una semana de espera y otra de margen.
    expect(streakDeadline(T0, 7 * 24 * 60)).toBe(T0 + 14 * DAY);
  });

  it("suma si llega a tiempo, vuelve a 1 si no, y guarda la mejor", () => {
    let s = nextStreak(undefined, T0, DAILY);
    s = nextStreak(s, T0 + DAY, DAILY);
    s = nextStreak(s, T0 + 2 * DAY, DAILY);
    expect(s).toMatchObject({ count: 3, best: 3 });
    s = nextStreak(s, T0 + 10 * DAY, DAILY);
    expect(s).toMatchObject({ count: 1, best: 3 });
  });

  it("se rompe sola con el tiempo y avisa cuando quedan pocas horas", () => {
    const s = nextStreak(nextStreak(undefined, T0, DAILY), T0 + DAY, DAILY);
    expect(liveStreak(s, s.until)).toBe(2);
    expect(liveStreak(s, s.until + 1)).toBe(0);
    expect(streakAtRisk(s, DAILY, s.until - 7 * HOUR)).toBe(false);
    expect(streakAtRisk(s, DAILY, s.until - 5 * HOUR)).toBe(true);
    expect(streakAtRisk(s, DAILY, s.until + 1)).toBe(false);
    expect([3, 7, 30].every(isStreakMilestone)).toBe(true);
    expect(isStreakMilestone(4)).toBe(false);
  });
});

describe("en la proyección", () => {
  const ev = (type: string, ts: number, extra: object = {}): GameEvent => ({ type, questId: "q", id: `e${ts}`, deviceId: "t", ts, ...extra }) as GameEvent;
  const created: GameEvent = { type: "quest_created", quest: questDef("q", { category: "repeat", cooldownMinutes: DAILY }), id: "e0", deviceId: "t", ts: T0 - 1 };
  const day = (n: number, done = true): GameEvent[] => [
    ev("quest_accepted", T0 + n * DAY),
    ...(done ? [ev("quest_completed", T0 + n * DAY + HOUR, { reward: { xp: 10, gold: 1 } })] : []),
  ];

  it("cuenta las veces seguidas de una repetible, y un duplicado no la sube", () => {
    const st = project([created, ...day(0), ...day(1), ev("quest_completed", T0 + DAY + 2 * HOUR, { reward: { xp: 10, gold: 1 } }), ...day(2)]);
    expect(st.quests.get("q")!.streak).toMatchObject({ count: 3, best: 3 });
    // Y queda en la crónica.
    expect(st.chronicle.entries.map((e) => (e.k === "quest" ? e.streak : 0))).toEqual([1, 2, 3]);
  });

  it("saltarse un día la reinicia, y una quest que no se repite no tiene racha", () => {
    const st = project([created, ...day(0), ...day(1), ...day(4)]);
    expect(st.quests.get("q")!.streak).toMatchObject({ count: 1, best: 2 });
    const once: GameEvent = { ...created, quest: questDef("q", { category: "elite" }) } as GameEvent;
    expect(project([once, ...day(0)]).quests.get("q")!.streak).toBeUndefined();
  });
});

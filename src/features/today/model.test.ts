import { describe, expect, it } from "vitest";
import { project } from "../../domain/projection";
import type { EventBody } from "../../domain/events";
import { agendaDef, at, HOUR, questDef, temporalDef } from "../../test/streams";
import { isQuietDay, todayPlan } from "./model";
import { calendarDay } from "../calendar/model";

// Miércoles 7 de octubre de 2026 a las 10:00, hora local (Europe/Madrid en los tests).
const NOW = new Date(2026, 9, 7, 10).getTime();
const day = (d: number, h = 0) => new Date(2026, 9, d, h).getTime();
const create = (id: string, extra: Parameters<typeof questDef>[1] = {}): EventBody => ({ type: "quest_created", quest: questDef(id, { createdAt: day(1), ...extra }) });

function plan(events: { ts: number; body: EventBody }[], now = NOW) {
  const st = project(events.map((e) => at(e.ts, e.body)));
  return todayPlan({ quests: st.quests, temporals: st.temporals, agenda: st.agenda.values(), chronicle: st.chronicle }, now);
}

describe("todayPlan", () => {
  it("un día sin nada es un día libre", () => {
    expect(isQuietDay(plan([]))).toBe(true);
  });

  it("separa lo que se pierde esta noche, lo que está en curso y lo vencido de antes", () => {
    const p = plan([
      { ts: day(1), body: create("hoy", { dueAt: day(7) }) },
      { ts: day(1), body: create("mañana", { dueAt: day(8) }) },
      { ts: day(1), body: create("viejo", { dueAt: day(2) }) },
      { ts: day(1), body: create("curso") },
      { ts: day(6), body: { type: "quest_accepted", questId: "curso" } },
      { ts: day(1), body: { type: "temporal_created", temporal: temporalDef("cita", { dueAt: day(7, 17), allDay: false, planned: true }) } },
    ]);
    expect(p.tonight.quests.map((q) => q.id)).toEqual(["hoy"]);
    expect(p.tonight.temporals.map((t) => t.id)).toEqual(["cita"]);
    expect(p.active.map((q) => q.id)).toEqual(["curso"]);
    expect(p.stale.quests.map((q) => q.id)).toEqual(["viejo"]);
    expect(p.endsAt).toBe(day(8));
    expect(p.agenda.timed.map((x) => x.id)).toEqual(["cita"]);
    expect(p.next[0]).toMatchObject({ date: "2026-10-08", quests: 1 });
  });

  it("toca hoy: las que se repiten por días si hoy toca, y las que ya han vuelto", () => {
    const p = plan([
      { ts: day(1), body: create("mie", { repeatDays: [3] }) },
      { ts: day(1), body: create("jue", { repeatDays: [4] }) },
      { ts: day(1), body: create("diaria", { category: "repeat", cooldownMinutes: 60 }) },
      { ts: day(1), body: create("unica") },
    ]);
    expect(p.due.map((q) => q.id)).toEqual(["mie", "diaria"]);
  });

  it("rachas en peligro: vivas y que se rompen hoy", () => {
    const p = plan([
      { ts: day(1), body: create("r", { repeatDays: [1, 3] }) },
      { ts: day(5, 9), body: { type: "quest_accepted", questId: "r" } },
      { ts: day(5, 9) + 1, body: { type: "quest_completed", questId: "r", reward: { xp: 1, gold: 1 } } },
    ]);
    // Una sola vez no es racha.
    expect(p.streaks).toEqual([]);
    // Dos veces seguidas (el jueves 1 y el lunes 5): la racha dura hasta que acaba hoy, miércoles.
    const p2 = plan([
      { ts: day(1), body: create("r", { repeatDays: [1, 3] }) },
      { ts: day(1, 9), body: { type: "quest_accepted", questId: "r" } },
      { ts: day(1, 9) + 1, body: { type: "quest_completed", questId: "r", reward: { xp: 1, gold: 1 } } },
      { ts: day(5, 9), body: { type: "quest_accepted", questId: "r" } },
      { ts: day(5, 9) + 1, body: { type: "quest_completed", questId: "r", reward: { xp: 1, gold: 1 } } },
    ]);
    expect(p2.streaks.map((q) => q.id)).toEqual(["r"]);
    expect(p2.due).toEqual([]);
  });

  it("lo hecho hoy sale de la crónica", () => {
    const p = plan([
      { ts: day(1), body: create("q") },
      { ts: NOW - HOUR, body: { type: "quest_accepted", questId: "q" } },
      { ts: NOW - HOUR + 1, body: { type: "quest_completed", questId: "q", reward: { xp: 40, gold: 7 } } },
    ]);
    expect(p.done).toMatchObject({ quests: 1, xp: 40, gold: 7, failed: 0 });
  });
});

describe("calendario: quests que se repiten por días", () => {
  it("salen cada día que tocan, de hoy en adelante, y marcadas como hechas el día que se completaron", () => {
    const st = project([
      at(day(1), create("g", { repeatDays: [3, 5] })),
      at(day(7, 8), { type: "quest_accepted", questId: "g" }),
      at(day(7, 9), { type: "quest_completed", questId: "g", reward: { xp: 1, gold: 1 } }),
    ]);
    const src = { quests: [...st.quests.values()], temporals: [], agenda: [agendaDef("a")].map((a) => ({ ...a, skipped: [] })), today: "2026-10-07" };
    const wed = calendarDay("2026-10-07", src).allDay.find((x) => x.id === "g");
    expect(wed).toMatchObject({ kind: "quest", repeats: true, done: true });
    expect(calendarDay("2026-10-09", src).allDay.some((x) => x.id === "g")).toBe(true);
    expect(calendarDay("2026-10-08", src).allDay.some((x) => x.id === "g")).toBe(false);
    // El miércoles pasado no: no se sabe qué pasó.
    expect(calendarDay("2026-09-30", src).allDay.some((x) => x.id === "g")).toBe(false);
  });
});

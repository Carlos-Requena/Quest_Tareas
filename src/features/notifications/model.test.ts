import { describe, expect, it } from "vitest";
import { project } from "../../domain/projection";
import type { EventBody } from "../../domain/events";
import { agendaDef, at, MIN, questDef, temporalDef } from "../../test/streams";
import { AGENDA_LEAD_MS, notificationId, planReminders, pomodoroBoundaries, TEMPORAL_LEAD_MS } from "./model";

// Miércoles 7 de octubre de 2026 a las 8:00, hora local (Europe/Madrid en los tests).
const NOW = new Date(2026, 9, 7, 8).getTime();
const day = (d: number, h = 0, m = 0) => new Date(2026, 9, d, h, m).getTime();
const create = (id: string, extra: Parameters<typeof questDef>[1] = {}): EventBody => ({ type: "quest_created", quest: questDef(id, { createdAt: day(1), ...extra }) });

function plan(events: { ts: number; body: EventBody }[], now = NOW) {
  const st = project(events.map((e) => at(e.ts, e.body)));
  return planReminders({ quests: st.quests.values(), temporals: st.temporals.values(), agenda: st.agenda.values() }, now);
}

describe("pomodoroBoundaries", () => {
  it("cada concentración y cada descanso que queda; la última ronda acaba el pomodoro", () => {
    const plan = { rounds: 2, focusMinutes: 25, breakMinutes: 5 };
    const p = { status: "running" as const, offsetMs: 0, runningSince: NOW };
    expect(pomodoroBoundaries(p, plan, NOW)).toEqual([
      { at: NOW + 25 * MIN, phase: "focusDone", round: 1 },
      { at: NOW + 30 * MIN, phase: "breakDone", round: 2 },
      { at: NOW + 55 * MIN, phase: "allDone", round: 2 },
    ]);
    // Ya en el descanso: solo lo que queda.
    expect(pomodoroBoundaries(p, plan, NOW + 27 * MIN).map((b) => b.phase)).toEqual(["breakDone", "allDone"]);
    // En pausa, nada.
    expect(pomodoroBoundaries({ status: "paused", offsetMs: 10 * MIN }, plan, NOW)).toEqual([]);
  });
});

describe("planReminders", () => {
  it("fecha límite: por la mañana y por la tarde (se fracturará)", () => {
    const r = plan([{ ts: day(1), body: create("q", { dueAt: day(7) }) }]);
    expect(r.map((x) => [x.kind, x.at])).toEqual([
      ["questDue", day(7, 9)],
      ["questFracture", day(7, 20)],
    ]);
  });

  it("encargos: 15 min antes si tienen hora, por la mañana si son de todo el día, y el aviso de que se quemará", () => {
    const r = plan([
      { ts: day(1), body: { type: "temporal_created", temporal: temporalDef("cita", { dueAt: day(7, 17), allDay: false }) } },
      { ts: day(1), body: { type: "temporal_created", temporal: temporalDef("todo", { dueAt: day(8), allDay: true }) } },
    ]);
    expect(r.map((x) => [x.kind, x.title, x.at])).toEqual([
      ["temporal", "Encargo cita", day(7, 17) - TEMPORAL_LEAD_MS],
      ["temporalBurn", "Encargo cita", day(7, 20)],
      ["temporal", "Encargo todo", day(8, 9)],
      ["temporalBurn", "Encargo todo", day(8, 20)],
    ]);
  });

  it("agenda: 5 minutos antes de cada bloque de hoy y de los dos días siguientes", () => {
    const r = plan([{ ts: day(1), body: { type: "agenda_created", entry: agendaDef("a", { date: "2026-10-05", start: 19 * 60, end: 20 * 60, repeat: { days: [3, 4] } }) } }]);
    expect(r.map((x) => x.at)).toEqual([day(7, 19) - AGENDA_LEAD_MS, day(8, 19) - AGENDA_LEAD_MS]);
  });

  it("lo que ya pasó o está terminado no avisa", () => {
    const r = plan([
      { ts: day(1), body: create("q", { dueAt: day(7) }) },
      { ts: day(1), body: { type: "quest_accepted", questId: "q" } },
      { ts: day(1), body: { type: "quest_completed", questId: "q", reward: { xp: 1, gold: 1 } } },
    ]);
    expect(r).toEqual([]);
    expect(plan([{ ts: day(1), body: create("q", { dueAt: day(7) }) }], day(7, 21))).toEqual([]);
  });

  it("los ids de las notificaciones son estables y de 32 bits", () => {
    expect(notificationId("a")).toBe(notificationId("a"));
    expect(notificationId("a")).not.toBe(notificationId("b"));
    expect(notificationId("x".repeat(500))).toBeLessThan(2 ** 31);
    expect(notificationId("x")).toBeGreaterThan(0);
  });
});

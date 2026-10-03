import { describe, expect, it } from "vitest";
import { calendarDay, layoutDay } from "./model";
import { project } from "../../domain/projection";
import { agendaDef, at, questDef, T0, temporalDef } from "../../test/streams";

const day = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime();

describe("un día del calendario", () => {
  const st = project([
    at(T0, { type: "quest_created", quest: questDef("hoy", { dueAt: day(2026, 10, 5), category: "elite" }) }),
    at(T0, { type: "quest_created", quest: questDef("otro", { dueAt: day(2026, 10, 6) }) }),
    at(T0, { type: "quest_created", quest: questDef("sin", {}) }),
    at(T0, { type: "quest_created", quest: questDef("res", { dueAt: day(2026, 10, 5) }) }),
    at(T0, { type: "temporal_created", temporal: temporalDef("cita", { dueAt: day(2026, 10, 5, 10, 30), allDay: false }) }),
    at(T0, { type: "temporal_created", temporal: temporalDef("plan", { dueAt: day(2026, 10, 5), allDay: true, questIds: ["res"], planned: true }) }),
    at(T0, { type: "agenda_created", entry: agendaDef("gym", { date: "2026-10-05", start: 19 * 60, end: 20 * 60 + 30, repeat: { days: [1, 4] } }) }),
    at(T0, { type: "agenda_created", entry: agendaDef("des", { date: "2026-10-05", start: 8 * 60, end: 8 * 60 + 30 }) }),
  ]);

  it("quests con su fecha, encargos y bloques; sin las de otro día, sin fecha ni en reserva", () => {
    const d = calendarDay("2026-10-05", { quests: st.quests.values(), temporals: st.temporals.values(), agenda: st.agenda.values() });
    expect(d.allDay.map((i) => i.id)).toEqual(["plan", "hoy"]);
    expect(d.allDay[0]).toMatchObject({ kind: "temporal", accepted: false });
    expect(d.timed.map((i) => [i.id, i.start, i.end])).toEqual([
      ["des", 480, 510],
      ["cita", 630, 690],
      ["gym", 1140, 1230],
    ]);
  });

  it("la repetición de la agenda sigue los días de la semana", () => {
    const thu = calendarDay("2026-10-08", { quests: st.quests.values(), temporals: st.temporals.values(), agenda: st.agenda.values() });
    expect(thu.timed.map((i) => i.id)).toEqual(["gym"]);
    expect(calendarDay("2026-10-07", { quests: [], temporals: [], agenda: st.agenda.values() }).timed).toEqual([]);
  });
});

describe("rejilla del día", () => {
  it("los que se solapan van en columnas; los que no, a lo ancho", () => {
    const slots = layoutDay([
      { key: "a", start: 540, end: 600 },
      { key: "b", start: 570, end: 660 },
      { key: "c", start: 600, end: 630 },
      { key: "d", start: 700, end: 760 },
    ]);
    expect(slots.get("a")).toEqual({ col: 0, cols: 2 });
    expect(slots.get("b")).toEqual({ col: 1, cols: 2 });
    // c empieza cuando a acaba: reutiliza su columna dentro del mismo grupo.
    expect(slots.get("c")).toEqual({ col: 0, cols: 2 });
    expect(slots.get("d")).toEqual({ col: 0, cols: 1 });
  });
});

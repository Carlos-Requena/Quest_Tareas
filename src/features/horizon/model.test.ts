import { describe, expect, it } from "vitest";
import { countHorizons, deadlineIn, horizonOf, isOverdue, questDue, type Due } from "./model";
import type { QuestState } from "../../domain/types";
import type { TemporalState } from "../temporal/model";
import { HOUR } from "../../test/streams";

const NOW = new Date(2026, 9, 2, 12, 0).getTime(); // 2 oct 2026, 12:00 en Madrid
const allDay = (days: number, now = NOW): Due => ({ dueAt: deadlineIn(days, now), allDay: true });

describe("zona horaria de los tests", () => {
  it("es Europe/Madrid (CEST en octubre)", () => {
    expect(new Date(NOW).getTimezoneOffset()).toBe(-120);
  });
});

describe("horizonOf: cada fecha cae en un solo plazo", () => {
  it.each([
    [-3, "day"], [0, "day"], [1, "day"],
    [2, "week"], [7, "week"],
    [8, "fortnight"], [14, "fortnight"],
    [15, "month"], [30, "month"],
    [31, "later"], [400, "later"],
  ] as const)("dentro de %i días → %s", (days, h) => {
    expect(horizonOf(allDay(days), NOW)).toBe(h);
  });

  it("sin fecha → none", () => {
    expect(horizonOf(undefined, NOW)).toBe("none");
  });

  it("una cita a las 23:59 de hoy sigue siendo de hoy", () => {
    expect(horizonOf({ dueAt: new Date(2026, 9, 2, 23, 59).getTime(), allDay: false }, NOW)).toBe("day");
  });

  it("los contadores suman el total", () => {
    const list = [-1, 0, 3, 10, 20, 90].map((d) => allDay(d));
    const n = countHorizons([...list, undefined], (x) => x, NOW);
    expect(n).toEqual({ all: 7, day: 2, week: 1, fortnight: 1, month: 1, later: 1, none: 1 });
  });
});

describe("cambios de hora", () => {
  it("deadlineIn da la medianoche local aunque el día tenga 23 o 25 horas", () => {
    const spring = new Date(2026, 2, 28, 12).getTime(); // la noche del 29 de marzo se adelanta la hora
    expect(deadlineIn(2, spring) - deadlineIn(1, spring)).toBe(23 * HOUR);
    expect(new Date(deadlineIn(2, spring)).getHours()).toBe(0);
    const autumn = new Date(2026, 9, 24, 12).getTime(); // la noche del 25 de octubre se atrasa
    expect(deadlineIn(2, autumn) - deadlineIn(1, autumn)).toBe(25 * HOUR);
    expect(horizonOf(allDay(7, autumn), autumn)).toBe("week");
    expect(horizonOf(allDay(8, autumn), autumn)).toBe("fortnight");
  });
});

describe("vencimiento", () => {
  it("lo de todo el día vence al acabar su día; lo que tiene hora, a su hora", () => {
    const today = allDay(0);
    expect(isOverdue(today, NOW)).toBe(false);
    expect(isOverdue(today, deadlineIn(1, NOW))).toBe(true);
    const at15 = { dueAt: new Date(2026, 9, 2, 15).getTime(), allDay: false };
    expect(isOverdue(at15, NOW)).toBe(false);
    expect(isOverdue(at15, at15.dueAt)).toBe(true);
  });
});

describe("questDue: fecha de una quest", () => {
  const temporal = (dueAt: number, status: "pending" | "done" = "pending") => ({ id: "t", dueAt, allDay: true, status }) as TemporalState;
  const quest = (extra: Partial<QuestState>) => ({ status: "available", ...extra }) as QuestState;

  it("la suya o la de su encargo, la que llegue antes", () => {
    const early = deadlineIn(3, NOW);
    const late = deadlineIn(10, NOW);
    const board = new Map([["t", temporal(early)]]);
    expect(questDue(quest({ dueAt: late, temporalId: "t" }), board)).toMatchObject({ dueAt: early, temporal: { id: "t" } });
    expect(questDue(quest({ dueAt: early, temporalId: "t" }), new Map([["t", temporal(late)]]))).toEqual({ dueAt: early, allDay: true });
  });

  it("un encargo cumplido no da fecha y una quest completada no tiene plazo", () => {
    const board = new Map([["t", temporal(deadlineIn(3, NOW), "done")]]);
    expect(questDue(quest({ temporalId: "t" }), board)).toBeUndefined();
    expect(questDue(quest({ status: "done", dueAt: NOW }), new Map())).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { addDays, agendaOn, applyAgendaEvent, atMinute, dateKey, isDateKey, newAgendaAcc, normalizeAgenda, occursOn, parseClock, weekDays, weekStart, weekday, type AgendaAcc } from "./model";
import type { AgendaEventBody } from "./events";
import { agendaDef } from "../../test/streams";

const run = (bodies: AgendaEventBody[]): AgendaAcc => {
  const acc = newAgendaAcc();
  for (const b of bodies) applyAgendaEvent(acc, b);
  return acc;
};

describe("días de la agenda", () => {
  it("AAAA-MM-DD en la hora local, también con el cambio de hora", () => {
    expect(dateKey(new Date(2026, 9, 3, 23, 59).getTime())).toBe("2026-10-03");
    expect(isDateKey("2026-02-29")).toBe(false);
    expect(isDateKey("2028-02-29")).toBe(true);
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26"); // cruza el cambio de hora del 25
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    // 9:00 sigue siendo las 9:00 el día del cambio de hora.
    expect(new Date(atMinute("2026-10-25", 9 * 60)).getHours()).toBe(9);
  });

  it("semanas de lunes a domingo", () => {
    expect(weekday("2026-10-04")).toBe(0); // domingo
    expect(weekStart("2026-10-04")).toBe("2026-09-28");
    expect(weekStart("2026-09-28")).toBe("2026-09-28");
    expect(weekDays("2026-09-28")).toEqual(["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
  });

  it("horas del formulario", () => {
    expect(parseClock("19:05")).toBe(1145);
    expect(parseClock("24:00")).toBe(1440);
    expect(parseClock("24:30")).toBeNaN();
    expect(parseClock("9:61")).toBeNaN();
  });
});

describe("repetición", () => {
  const e = (extra = {}) => ({ ...agendaDef("a"), skipped: [], ...extra });

  it("un bloque suelto solo está su día", () => {
    expect(occursOn(e({ date: "2026-10-05" }), "2026-10-05")).toBe(true);
    expect(occursOn(e({ date: "2026-10-05" }), "2026-10-12")).toBe(false);
  });

  it("los días de la semana elegidos, desde el primero y hasta el último, salvo los quitados", () => {
    // Lunes y jueves desde el lunes 5 de octubre hasta el 15.
    const g = e({ date: "2026-10-05", repeat: { days: [1, 4], until: "2026-10-15" }, skipped: ["2026-10-12"] });
    const on = weekDays("2026-09-28").concat(weekDays("2026-10-05"), weekDays("2026-10-12"), weekDays("2026-10-19")).filter((k) => occursOn(g, k));
    expect(on).toEqual(["2026-10-05", "2026-10-08", "2026-10-15"]);
  });

  it("los bloques de un día van por hora", () => {
    const list = [e({ id: "b", start: 600, end: 660 }), e({ id: "c", start: 480, end: 540 }), e({ id: "d", date: "2026-01-06" })];
    expect(agendaOn(list, "2026-01-05").map((o) => o.entry.id)).toEqual(["c", "b"]);
  });
});

describe("applyAgendaEvent: guardas", () => {
  it("datos mal formados: sin título o sin día no hay bloque; las horas y los días se ajustan", () => {
    expect(normalizeAgenda(agendaDef("x", { title: "  " }))).toBeUndefined();
    expect(normalizeAgenda(agendaDef("x", { date: "2026-02-31" }))).toBeUndefined();
    expect(normalizeAgenda(agendaDef("x", { start: -30, end: 2 }))).toMatchObject({ start: 0, end: 5 });
    expect(normalizeAgenda(agendaDef("x", { start: 2000, end: 9999 }))).toMatchObject({ start: 1435, end: 1440 });
    expect(normalizeAgenda(agendaDef("x", { color: "rosa" as never }))?.color).toBe("gold");
    expect(normalizeAgenda(agendaDef("x", { repeat: { days: [3, 1, 3, 9, -1], until: "2025-01-01" } }))?.repeat).toEqual({ days: [1, 3] });
    expect(normalizeAgenda(agendaDef("x", { repeat: { days: [] } }))?.repeat).toBeUndefined();
  });

  it("un id repetido o retirado no se vuelve a crear; el parche no toca la identidad ni los días quitados", () => {
    const acc = run([
      { type: "agenda_created", entry: agendaDef("a", { repeat: { days: [1] } }) },
      { type: "agenda_created", entry: agendaDef("a", { title: "Otro" }) },
      { type: "agenda_skipped", entryId: "a", date: "2026-01-12" },
      { type: "agenda_updated", entryId: "a", patch: { title: "Gimnasio", id: "zz", skipped: [] } as never },
      { type: "agenda_created", entry: agendaDef("b") },
      { type: "agenda_deleted", entryId: "b" },
      { type: "agenda_created", entry: agendaDef("b") },
    ]);
    expect(acc.entries.get("a")).toMatchObject({ id: "a", title: "Gimnasio", skipped: ["2026-01-12"] });
    expect(acc.entries.has("b")).toBe(false);
  });

  it("solo se quita un día que tiene bloque, de uno que se repite, y una vez", () => {
    const acc = run([
      { type: "agenda_created", entry: agendaDef("a", { date: "2026-01-05", repeat: { days: [1] } }) },
      { type: "agenda_created", entry: agendaDef("s", { date: "2026-01-05" }) },
      { type: "agenda_skipped", entryId: "a", date: "2026-01-06" }, // martes: no hay bloque
      { type: "agenda_skipped", entryId: "a", date: "2026-01-12" },
      { type: "agenda_skipped", entryId: "a", date: "2026-01-12" },
      { type: "agenda_skipped", entryId: "s", date: "2026-01-05" }, // suelto: se retira, no se salta
      { type: "agenda_skipped", entryId: "zz", date: "2026-01-05" },
    ]);
    expect(acc.entries.get("a")?.skipped).toEqual(["2026-01-12"]);
    expect(acc.entries.get("s")?.skipped).toEqual([]);
  });

  it("una edición mal formada no rompe el bloque", () => {
    const acc = run([
      { type: "agenda_created", entry: agendaDef("a") },
      { type: "agenda_updated", entryId: "a", patch: { title: "", date: "nunca" } },
    ]);
    expect(acc.entries.get("a")?.title).toBe("Bloque a");
  });
});

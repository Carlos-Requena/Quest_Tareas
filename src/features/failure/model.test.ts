import { describe, expect, it } from "vitest";
import { project } from "../../domain/projection";
import type { EventBody } from "../../domain/events";
import { at, DAY, HOUR, questDef, temporalDef } from "../../test/streams";
import { dueFailures, failedSince, failsAt, questFailsBy } from "./model";
import { blockers } from "../complex/model";
import { pendingLinks } from "../temporal/model";

// Fechas en la hora local (vitest fija Europe/Madrid): miércoles 7 de octubre de 2026.
const DUE = new Date(2026, 9, 7).getTime();
const END = new Date(2026, 9, 8).getTime();

const create = (id: string, extra: Parameters<typeof questDef>[1] = {}): EventBody => ({ type: "quest_created", quest: questDef(id, { createdAt: DUE - DAY, ...extra }) });

describe("plazo de los fallos", () => {
  it("falla al acabar el día de la fecha, también en el cambio de hora", () => {
    expect(failsAt(DUE)).toBe(END);
    expect(failsAt(DUE + 10 * HOUR)).toBe(END);
    // 25 de octubre de 2026: el día tiene 25 horas en Madrid.
    expect(failsAt(new Date(2026, 9, 25, 12).getTime())).toBe(new Date(2026, 9, 26).getTime());
  });

  it("una quest que se repite o sin fecha no falla", () => {
    const base = { status: "available" as const, category: "request" as const, dueAt: DUE };
    expect(questFailsBy(base, END)).toBe(true);
    expect(questFailsBy(base, END - 1)).toBe(false);
    expect(questFailsBy({ ...base, dueAt: undefined }, END)).toBe(false);
    expect(questFailsBy({ ...base, repeatDays: [1] }, END)).toBe(false);
    expect(questFailsBy({ ...base, status: "done" }, END)).toBe(false);
  });
});

describe("quest_failed", () => {
  it("se fractura solo tras su día: sale del tablón sin recompensa y queda en la crónica", () => {
    const early = project([at(DUE - DAY, create("q", { dueAt: DUE })), at(END - 1, { type: "quest_failed", questId: "q" })]);
    expect(early.quests.get("q")?.status).toBe("available");
    const st = project([
      at(DUE - DAY, create("q", { dueAt: DUE })),
      at(DUE, { type: "quest_accepted", questId: "q" }),
      at(END, { type: "quest_failed", questId: "q" }),
      at(END + 1, { type: "quest_failed", questId: "q" }),
      at(END + 2, { type: "quest_completed", questId: "q", reward: { xp: 99, gold: 9 } }),
    ]);
    const q = st.quests.get("q")!;
    expect(q.status).toBe("done");
    expect(q.failedAt).toBe(END);
    expect(st.player.xp).toBe(0);
    expect(st.chronicle.entries.filter((e) => e.k === "failed")).toHaveLength(1);
  });

  it("un requisito fallido deja de bloquear", () => {
    const st = project([at(DUE - DAY, create("r", { dueAt: DUE })), at(DUE - DAY, create("q", { requires: ["r"] })), at(END, { type: "quest_failed", questId: "r" })]);
    expect(blockers(st.quests.get("q")!, st.quests)).toEqual([]);
  });
});

describe("temporal_failed", () => {
  const temporal = (extra: Parameters<typeof temporalDef>[1] = {}): EventBody => ({
    type: "temporal_created",
    temporal: temporalDef("t", { dueAt: DUE + 10 * HOUR, allDay: false, questIds: ["a", "b", "r"], ...extra }),
  });

  it("se quema tras su día y sus quests sin terminar fallan con él (no las que se repiten)", () => {
    const st = project([
      at(DUE - DAY, create("a")),
      at(DUE - DAY, create("b")),
      at(DUE - DAY, create("r", { category: "repeat", cooldownMinutes: 60 })),
      at(DUE - DAY, temporal()),
      at(DUE, { type: "quest_accepted", questId: "a" }),
      at(DUE, { type: "quest_completed", questId: "a", reward: { xp: 10, gold: 1 } }),
      at(DUE + 11 * HOUR, { type: "temporal_failed", temporalId: "t" }),
      at(END, { type: "temporal_failed", temporalId: "t" }),
      at(END + 1, { type: "temporal_completed", temporalId: "t", reward: { xp: 500, gold: 50 } }),
    ]);
    const t = st.temporals.get("t")!;
    expect(t.status).toBe("done");
    expect(t.failedAt).toBe(END);
    expect(t.earned).toBeUndefined();
    expect(st.quests.get("a")?.failedAt).toBeUndefined();
    expect(st.quests.get("b")?.failedAt).toBe(END);
    expect(st.quests.get("r")?.failedAt).toBeUndefined();
    expect(st.player.xp).toBe(10);
    expect(st.chronicle.entries[st.chronicle.entries.length - 1]).toMatchObject({ k: "failed", target: "temporal", quests: 1 });
  });

  it("una quest enlazada fallida no cuenta como terminada para el encargo", () => {
    const st = project([at(DUE - DAY, create("b", { dueAt: DUE })), at(DUE - DAY, temporal({ dueAt: DUE + 5 * DAY, questIds: ["b"] })), at(END, { type: "quest_failed", questId: "b" })]);
    expect(pendingLinks(st.temporals.get("t")!, st.quests).map((q) => q.id)).toEqual(["b"]);
  });
});

describe("dueFailures y failedSince", () => {
  it("perdona lo que venció antes de FAIL_SINCE_DAY y lista las quests de un encargo con él", () => {
    const st = project([
      at(DUE - DAY, create("old", { dueAt: new Date(2026, 9, 5).getTime() })),
      at(DUE - DAY, create("new", { dueAt: DUE })),
      at(DUE - DAY, create("b", { dueAt: DUE })),
      at(DUE - DAY, { type: "temporal_created", temporal: temporalDef("t", { dueAt: DUE, questIds: ["b"] }) }),
    ]);
    const due = dueFailures({ quests: st.quests.values(), temporals: st.temporals.values() }, END);
    expect(due.quests.map((q) => q.id)).toEqual(["new"]);
    expect(due.temporals.map((t) => t.id)).toEqual(["t"]);
    expect(dueFailures({ quests: st.quests.values(), temporals: st.temporals.values() }, END - 1)).toEqual({ quests: [], temporals: [] });
  });

  it("failedSince da lo que falló después de una marca, sin repetir las quests de un cartel quemado", () => {
    const st = project([
      at(DUE - DAY, create("q", { dueAt: DUE })),
      at(DUE - DAY, create("b")),
      at(DUE - DAY, { type: "temporal_created", temporal: temporalDef("t", { dueAt: DUE, questIds: ["b"] }) }),
      at(END, { type: "quest_failed", questId: "q" }),
      at(END + 5, { type: "temporal_failed", temporalId: "t" }),
    ]);
    const src = { quests: st.quests.values(), temporals: st.temporals.values() };
    const seen = failedSince(src, END - 1);
    expect(seen.quests.map((q) => q.id)).toEqual(["q"]);
    expect(seen.temporals.map((t) => t.id)).toEqual(["t"]);
    expect(failedSince({ quests: st.quests.values(), temporals: st.temporals.values() }, END + 5)).toEqual({ quests: [], temporals: [] });
  });
});

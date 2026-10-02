import { describe, expect, it } from "vitest";
import {
  applyTemporalEvent,
  clampSkulls,
  daysUntil,
  liveBlobIds,
  linkedQuestDone,
  needsAttention,
  newTemporalAcc,
  remindersDue,
  sortTemporals,
  suggestedReward,
  urgencyOf,
  type TemporalAcc,
  type TemporalState,
} from "./model";
import type { TemporalEventBody } from "./events";
import { linkState } from "./links";
import { project } from "../../domain/projection";
import { at, DAY, HOUR, MIN, questDef, T0, temporalDef } from "../../test/streams";

const NOW = new Date(2026, 9, 2, 12, 0).getTime();
const midnight = (d: number) => new Date(2026, 9, 2 + d).getTime();
const state = (extra: Partial<TemporalState>): TemporalState => ({ ...temporalDef("t"), status: "pending", linkedAt: {}, ...extra });

describe("dificultad y recompensa", () => {
  it("las calaveras van de 1 a 5", () => {
    expect([0, 1, 3.4, 5, 9, NaN].map(clampSkulls)).toEqual([1, 1, 3, 5, 5, 1]);
    expect(suggestedReward(9)).toEqual({ xp: 500, gold: 250 });
  });
});

describe("urgencia", () => {
  it("vencido, hoy, pronto (3 días), más adelante y cumplido", () => {
    expect(urgencyOf(state({ dueAt: midnight(0), allDay: true }), NOW)).toBe("today");
    expect(urgencyOf(state({ dueAt: midnight(-1), allDay: true }), NOW)).toBe("overdue");
    expect(urgencyOf(state({ dueAt: NOW + HOUR, allDay: false }), NOW)).toBe("today");
    expect(urgencyOf(state({ dueAt: NOW - MIN, allDay: false }), NOW)).toBe("overdue");
    expect(urgencyOf(state({ dueAt: midnight(3), allDay: true }), NOW)).toBe("soon");
    expect(urgencyOf(state({ dueAt: midnight(4), allDay: true }), NOW)).toBe("later");
    expect(urgencyOf(state({ dueAt: midnight(-9), status: "done" }), NOW)).toBe("done");
  });

  it("daysUntil cuenta días naturales, no bloques de 24 h", () => {
    expect(daysUntil(new Date(2026, 9, 3, 0, 30).getTime(), new Date(2026, 9, 2, 23, 30).getTime())).toBe(1);
    expect(daysUntil(new Date(2026, 2, 30).getTime(), new Date(2026, 2, 28, 12).getTime())).toBe(2); // con cambio de hora
  });

  it("orden del tablón, avisos y recordatorios", () => {
    const a = state({ id: "a", dueAt: midnight(2) });
    const b = state({ id: "b", dueAt: midnight(-1) });
    const c = state({ id: "c", status: "done", completedAt: 5 });
    const d = state({ id: "d", status: "done", completedAt: 9 });
    expect(sortTemporals([c, a, d, b]).map((t) => t.id)).toEqual(["b", "a", "d", "c"]);
    expect(needsAttention([a, b, state({ id: "e", dueAt: midnight(0) })], NOW)).toBe(2);
    const soon = state({ id: "s", allDay: false, dueAt: NOW + 10 * MIN });
    const far = state({ id: "f", allDay: false, dueAt: NOW + 2 * HOUR });
    expect(remindersDue([soon, far, state({ dueAt: NOW + 5 * MIN })], NOW, 15 * MIN).map((t) => t.id)).toEqual(["s"]);
  });
});

describe("applyTemporalEvent: guardas", () => {
  const run = (bodies: TemporalEventBody[], linkDone: (q: string, since: number) => boolean = () => true) => {
    const acc: TemporalAcc = newTemporalAcc();
    const earned: unknown[] = [];
    bodies.forEach((b, i) => earned.push(applyTemporalEvent(acc, b, T0 + i * MIN, linkDone)));
    return { acc, earned };
  };
  const created = (extra = {}): TemporalEventBody => ({ type: "temporal_created", temporal: temporalDef("t", extra) });

  it("un id repetido o retirado no se vuelve a crear", () => {
    const { acc } = run([created(), { ...created(), temporal: temporalDef("t", { title: "otro" }) } as TemporalEventBody]);
    expect(acc.board.get("t")?.title).toBe("Encargo t");
    const gone = run([created(), { type: "temporal_deleted", temporalId: "t" }, created()]).acc;
    expect(gone.board.has("t")).toBe(false);
  });

  it("los datos mal formados se corrigen al leer", () => {
    const { acc } = run([created({ kind: "raro", difficulty: 12, questIds: undefined })]);
    expect(acc.board.get("t")).toMatchObject({ kind: "summons", difficulty: 5, questIds: [] });
  });

  it("un parche no toca la identidad, los adjuntos, las quests ni el estado, y no edita lo cumplido", () => {
    const { acc } = run([
      created(),
      { type: "temporal_updated", temporalId: "t", patch: { title: "Nuevo", id: "x", status: "done", questIds: ["q"], attachments: [] } as never },
    ]);
    expect(acc.board.get("t")).toMatchObject({ id: "t", title: "Nuevo", status: "pending", questIds: [] });
    const done = run([created(), { type: "temporal_completed", temporalId: "t", reward: { xp: 1, gold: 1 } }, { type: "temporal_updated", temporalId: "t", patch: { title: "Tarde" } }]).acc;
    expect(done.board.get("t")?.title).toBe("Encargo t");
  });

  it("solo cobra una vez y nunca en negativo", () => {
    const { earned, acc } = run([
      created(),
      { type: "temporal_completed", temporalId: "t", reward: { xp: -50, gold: 30 } },
      { type: "temporal_completed", temporalId: "t", reward: { xp: 999, gold: 999 } },
    ]);
    expect(earned.filter(Boolean)).toEqual([{ xp: 0, gold: 30 }]);
    expect(acc.board.get("t")).toMatchObject({ status: "done", earned: { xp: 0, gold: 30 } });
  });

  it("adjuntos: sin duplicados; quitar uno que no está no hace nada", () => {
    const att = { id: "a1", blobId: "sha", name: "x.pdf", mime: "application/pdf", size: 1, addedAt: 0 };
    const { acc } = run([
      created(),
      { type: "temporal_attached", temporalId: "t", attachment: att },
      { type: "temporal_attached", temporalId: "t", attachment: att },
      { type: "temporal_detached", temporalId: "t", attachmentId: "zz" },
    ]);
    expect(acc.board.get("t")?.attachments).toHaveLength(1);
    expect(liveBlobIds(acc.board.values())).toEqual(new Set(["sha"]));
  });

  it("enlaces: sin repetir, como mucho 12 y una quest no puede estar en dos encargos pendientes", () => {
    const links = Array.from({ length: 14 }, (_, i): TemporalEventBody => ({ type: "temporal_linked", temporalId: "t", questId: `q${i}` }));
    const { acc } = run([
      created(),
      { type: "temporal_created", temporal: temporalDef("u") },
      ...links,
      { type: "temporal_linked", temporalId: "t", questId: "q0" },
      { type: "temporal_linked", temporalId: "u", questId: "q0" },
    ]);
    expect(acc.board.get("t")?.questIds).toHaveLength(12);
    expect(acc.board.get("u")?.questIds).toEqual([]);
  });

  it("no se cumple mientras quede una quest enlazada sin terminar", () => {
    const blocked = run([created({ questIds: ["q"] }), { type: "temporal_completed", temporalId: "t", reward: { xp: 1, gold: 1 } }], () => false);
    expect(blocked.acc.board.get("t")?.status).toBe("pending");
    const unlinked = run([
      created({ questIds: ["q"] }),
      { type: "temporal_unlinked", temporalId: "t", questId: "q" },
      { type: "temporal_completed", temporalId: "t", reward: { xp: 1, gold: 1 } },
    ], () => false);
    expect(unlinked.acc.board.get("t")?.status).toBe("done");
  });
});

describe("quests enlazadas en la proyección", () => {
  it("una repetible cuenta solo si se completa después de enlazarla", () => {
    expect(linkedQuestDone({ status: "cooldown", lastCompletedAt: 100 }, 50)).toBe(true);
    expect(linkedQuestDone({ status: "cooldown", lastCompletedAt: 100 }, 150)).toBe(false);
    expect(linkedQuestDone({ status: "done" }, 999)).toBe(true);

    const base = [
      at(T0, { type: "quest_created", quest: questDef("r", { category: "repeat", cooldownMinutes: 1 }) }),
      at(T0 + MIN, { type: "quest_accepted", questId: "r" }),
      at(T0 + 2 * MIN, { type: "quest_completed", questId: "r", reward: { xp: 10, gold: 0 } }),
      at(T0 + 3 * MIN, { type: "temporal_created", temporal: temporalDef("t") }),
      at(T0 + 4 * MIN, { type: "temporal_linked", temporalId: "t", questId: "r" }),
    ];
    const tooEarly = project([...base, at(T0 + 5 * MIN, { type: "temporal_completed", temporalId: "t", reward: { xp: 300, gold: 0 } })]);
    expect(tooEarly.temporals.get("t")?.status).toBe("pending");
    expect(tooEarly.player.xp).toBe(10);
    const ok = project([
      ...base,
      at(T0 + DAY, { type: "quest_accepted", questId: "r" }),
      at(T0 + DAY + MIN, { type: "quest_completed", questId: "r", reward: { xp: 10, gold: 0 } }),
      at(T0 + DAY + 2 * MIN, { type: "temporal_completed", temporalId: "t", reward: { xp: 300, gold: 0 } }),
    ]);
    expect(ok.temporals.get("t")?.status).toBe("done");
    expect(ok.player.xp).toBe(320);
  });

  it("linkState: terminada, en curso, bloqueada, por aceptar o en espera", () => {
    const st = project([
      at(T0, { type: "quest_created", quest: questDef("a") }),
      at(T0, { type: "quest_created", quest: questDef("b", { requires: ["a"] }) }),
      at(T0, { type: "quest_created", quest: questDef("r", { category: "repeat", cooldownMinutes: 60 }) }),
      at(T0 + MIN, { type: "quest_accepted", questId: "r" }),
      at(T0 + 2 * MIN, { type: "quest_completed", questId: "r", reward: { xp: 1, gold: 0 } }),
      at(T0 + 3 * MIN, { type: "quest_accepted", questId: "a" }),
    ]);
    const q = (id: string) => st.quests.get(id)!;
    const now = T0 + 10 * MIN;
    expect(linkState(q("a"), T0, st.quests, now)).toBe("active");
    expect(linkState(q("b"), T0, st.quests, now)).toBe("locked");
    expect(linkState(q("r"), T0 + 5 * MIN, st.quests, now)).toBe("cooldown");
    expect(linkState(q("r"), T0, st.quests, now)).toBe("done");
    expect(linkState(q("r"), T0 + 5 * MIN, st.quests, T0 + 2 * HOUR)).toBe("available");
  });
});

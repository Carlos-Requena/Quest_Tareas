import { describe, expect, it } from "vitest";
import {
  applyTemporalEvent,
  clampSkulls,
  countAccept,
  matchesAccept,
  daysUntil,
  artBlobIds,
  artsOf,
  heroesByKind,
  liveBlobIds,
  linkedQuestDone,
  needsAttention,
  newTemporalAcc,
  pickHero,
  remindersDue,
  sortTemporals,
  suggestedReward,
  urgencyOf,
  type TemporalAcc,
  type TemporalArt,
  type TemporalKind,
  type TemporalState,
} from "./model";
import type { TemporalEventBody } from "./events";
import { linkState } from "./links";
import { project } from "../../domain/projection";
import { at, DAY, HOUR, MIN, questDef, T0, temporalArt, temporalDef } from "../../test/streams";

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

describe("aceptados y sin aceptar", () => {
  const run = (bodies: TemporalEventBody[], linkDone: (q: string, since: number) => boolean = () => true) => {
    const acc: TemporalAcc = newTemporalAcc();
    bodies.forEach((b, i) => applyTemporalEvent(acc, b, T0 + i * MIN, linkDone));
    return acc;
  };
  const planned: TemporalEventBody = { type: "temporal_created", temporal: temporalDef("t", { planned: true }) };
  const complete: TemporalEventBody = { type: "temporal_completed", temporalId: "t", reward: { xp: 10, gold: 10 } };

  it("los encargos anteriores (sin `planned`) nacen aceptados; los nuevos sin aceptar, no", () => {
    expect(run([{ type: "temporal_created", temporal: temporalDef("t") }]).board.get("t")?.acceptedAt).toBe(T0);
    const t = run([planned]).board.get("t")!;
    expect(t.acceptedAt).toBeUndefined();
    expect("planned" in t).toBe(false);
  });

  it("aceptar cuenta una vez; aplazar solo uno aceptado; sin aceptar no se cumple", () => {
    const acc = run([planned, complete, { type: "temporal_postponed", temporalId: "t" }, { type: "temporal_accepted", temporalId: "t" }, { type: "temporal_accepted", temporalId: "t" }]);
    expect(acc.board.get("t")).toMatchObject({ status: "pending", acceptedAt: T0 + 3 * MIN });
    const later = run([planned, { type: "temporal_accepted", temporalId: "t" }, { type: "temporal_postponed", temporalId: "t" }, complete]);
    expect(later.board.get("t")).toMatchObject({ status: "pending" });
    expect(later.board.get("t")?.acceptedAt).toBeUndefined();
    const ok = run([planned, { type: "temporal_accepted", temporalId: "t" }, complete]);
    expect(ok.board.get("t")?.status).toBe("done");
    // Lo cumplido ya no se aplaza.
    expect(run([planned, { type: "temporal_accepted", temporalId: "t" }, complete, { type: "temporal_postponed", temporalId: "t" }]).board.get("t")?.acceptedAt).toBe(T0 + MIN);
  });

  it("un parche no acepta ni aplaza", () => {
    const acc = run([planned, { type: "temporal_updated", temporalId: "t", patch: { title: "X", acceptedAt: 5, planned: false } as never }]);
    expect(acc.board.get("t")).toMatchObject({ title: "X" });
    expect(acc.board.get("t")?.acceptedAt).toBeUndefined();
  });

  it("orden: aceptados primero, cada grupo por fecha; filtro y recuento", () => {
    const st = (id: string, d: number, acceptedAt?: number) => state({ id, dueAt: midnight(d), acceptedAt });
    const list = [st("p1", 1), st("a5", 5, 1), st("p0", 0), st("a2", 2, 1)];
    expect(sortTemporals(list).map((t) => t.id)).toEqual(["a2", "a5", "p0", "p1"]);
    expect(list.filter((t) => matchesAccept("planned", t)).map((t) => t.id)).toEqual(["p1", "p0"]);
    expect(list.filter((t) => matchesAccept("all", t))).toHaveLength(4);
    expect(countAccept(list)).toEqual({ all: 4, accepted: 2, planned: 2 });
  });

  it("proyección: sus quests quedan en reserva y no se aceptan hasta aceptar el encargo", () => {
    const base = [
      at(T0, { type: "quest_created", quest: questDef("q") }),
      at(T0 + MIN, { type: "temporal_created", temporal: temporalDef("t", { questIds: ["q"], planned: true }) }),
      at(T0 + 2 * MIN, { type: "quest_accepted", questId: "q" }),
    ];
    const held = project(base);
    expect(held.quests.get("q")).toMatchObject({ status: "available", reserved: true, temporalId: "t" });
    expect(linkState(held.quests.get("q")!, T0 + MIN, held.quests, T0 + 3 * MIN)).toBe("reserved");

    const freed = project([...base, at(T0 + 3 * MIN, { type: "temporal_accepted", temporalId: "t" }), at(T0 + 4 * MIN, { type: "quest_accepted", questId: "q" })]);
    expect(freed.quests.get("q")?.status).toBe("active");
    expect(freed.quests.get("q")?.reserved).toBeUndefined();

    // Aplazar con la quest en curso (otro equipo, sin conexión): sigue en curso y a la vista.
    const busy = project([
      ...base,
      at(T0 + 3 * MIN, { type: "temporal_accepted", temporalId: "t" }),
      at(T0 + 4 * MIN, { type: "quest_accepted", questId: "q" }),
      at(T0 + 5 * MIN, { type: "temporal_postponed", temporalId: "t" }),
    ]);
    expect(busy.quests.get("q")).toMatchObject({ status: "active" });
    expect(busy.quests.get("q")?.reserved).toBeUndefined();

    // Retirar el encargo libera sus quests.
    expect(project([...base, at(T0 + 3 * MIN, { type: "temporal_deleted", temporalId: "t" })]).quests.get("q")?.reserved).toBeUndefined();
  });
});

describe("ilustraciones de «Encargo cumplido»", () => {
  const heroes = heroesByKind(["hunt/kazuma.webp", "Hunt/aqua.png", "summons/subaru.webp", "otro/x.webp", "suelta.webp", "/raiz.webp"]);

  it("agrupa por la carpeta de su tipo e ignora lo demás", () => {
    expect(heroes).toEqual({
      summons: ["summons/subaru.webp"],
      delivery: [],
      hunt: ["hunt/kazuma.webp", "Hunt/aqua.png"],
      scout: [],
      gathering: [],
    });
  });

  it("elige una de su tipo con el azar que recibe, y ninguna si la carpeta está vacía", () => {
    expect([0, 0.49, 0.5, 0.999999, 1, -1].map((r) => pickHero(heroes.hunt, r))).toEqual([
      "hunt/kazuma.webp",
      "hunt/kazuma.webp",
      "Hunt/aqua.png",
      "Hunt/aqua.png",
      "Hunt/aqua.png",
      "hunt/kazuma.webp",
    ]);
    expect(pickHero(heroes.summons, 0.7)).toBe("summons/subaru.webp");
    expect(pickHero(heroes.delivery, 0.3)).toBeUndefined();
  });

  describe("las que añade el jugador (eventos)", () => {
    const added = (id: string, extra: Partial<TemporalArt> = {}): TemporalEventBody => ({ type: "temporal_art_added", art: temporalArt(id, extra) });
    const run = (events: TemporalEventBody[]) => {
      const acc = newTemporalAcc();
      for (const e of events) applyTemporalEvent(acc, e, NOW);
      return acc;
    };

    it("se añaden una vez, se quitan y un añadido repetido no las resucita", () => {
      const acc = run([added("a"), added("a", { name: "Otra" }), added("b"), { type: "temporal_art_removed", artId: "a" }, added("a")]);
      expect([...acc.arts.keys()]).toEqual(["b"]);
      expect(acc.arts.get("b")?.name).toBe("Ilustración b");
    });

    it("ignora las de un tipo desconocido, sin imagen o sin id; el nombre vacío pasa a «?»", () => {
      const acc = run([added("x", { kind: "boss" as TemporalKind }), added("y", { blobId: "" }), added("", {}), added("z", { name: "   " })]);
      expect([...acc.arts.keys()]).toEqual(["z"]);
      expect(acc.arts.get("z")?.name).toBe("?");
    });

    it("por tipo y en orden de llegada, y sus imágenes cuentan como usadas", () => {
      const acc = run([added("b", { createdAt: T0 + 2 }), added("a", { createdAt: T0 + 1 }), added("c", { kind: "summons" })]);
      expect(artsOf(acc.arts.values(), "hunt").map((a) => a.id)).toEqual(["a", "b"]);
      expect(artsOf(acc.arts.values(), "delivery")).toEqual([]);
      expect(artBlobIds(acc.arts.values())).toEqual(new Set(["art-a", "art-b", "art-c"]));
    });

    it("no tocan al jugador y llegan al estado", () => {
      const st = project([at(T0, { type: "temporal_art_added", art: temporalArt("a") })]);
      expect(st.player.xp).toBe(0);
      expect(st.player.gold).toBe(0);
      expect([...st.temporalArts.keys()]).toEqual(["a"]);
    });
  });
});

import { describe, expect, it } from "vitest";
import { freeze } from "immer";
import { comparePos, type GameEvent } from "../../domain/events";
import { finishProjection, project, PROJECTION_VERSION, settleProjection, viewProjection } from "../../domain/projection";
import { DAY, questDef, randomStream, T0, temporalDef, withMeta } from "../../test/streams";
import {
  applyAll,
  applyNext,
  canonical,
  decodeSnapshot,
  emptyProjected,
  encodeSnapshot,
  goesAfter,
  isCurrent,
  makeSnapshot,
  SNAPSHOT_FORMAT,
  type Projected,
} from "./model";
import { hasUndo } from "../undo/model";

const SEEDS = Array.from({ length: 25 }, (_, i) => `s${i}`);
const full = (events: GameEvent[]) => canonical(project(events));

/** Lo que haría el arranque: snapshot de los `k` primeros, guardado, leído y la cola encima. */
function viaSnapshot(events: GameEvent[], k: number): string {
  const head = applyAll(emptyProjected(), events.slice(0, k));
  const saved = makeSnapshot(head, 0);
  if (!saved) return canonical(finishProjection(applyAll(emptyProjected(), events).acc));
  const snap = decodeSnapshot(encodeSnapshot(saved))!;
  // Como restore(): un deshacer en la cola obliga a reproducirlo todo (features/undo).
  if (hasUndo(events.slice(k))) return canonical(finishProjection(applyAll(emptyProjected(), events).acc));
  const p = applyAll({ acc: snap.acc, last: snap.upTo, count: snap.count }, events.slice(k));
  return canonical(finishProjection(p.acc));
}

describe("snapshot + cola = reproducirlo todo", () => {
  it("los historiales aleatorios están bien formados", () => {
    const ev = randomStream("s0", 400);
    expect(ev).toHaveLength(400);
    for (let i = 1; i < ev.length; i++) expect(comparePos(ev[i - 1], ev[i])).toBeLessThan(0);
    // Ejercitan de verdad la contabilidad: hay XP, oro y objetos.
    const st = project(ev);
    expect(st.player.xp).toBeGreaterThan(0);
    expect(st.player.completedCount).toBeGreaterThan(0);
  });

  it.each(SEEDS)("semilla %s: cualquier punto de corte da el mismo estado", (seed) => {
    const ev = randomStream(seed, 400);
    const expected = full(ev);
    for (const k of [0, 1, 2, 37, 100, 199, 200, 333, 399, 400]) expect(viaSnapshot(ev, k)).toBe(expected);
  });

  it.each(SEEDS)("semilla %s: aplicar evento a evento con applyNext (como dispatch) da el mismo estado", (seed) => {
    const ev = randomStream(seed, 300);
    let p: Projected = emptyProjected();
    ev.forEach((_, i) => {
      p = dispatchLike(p, ev, i);
      // Tras cada paso el acumulador queda asentado: la vista, sin finishProjection, ya es la de project().
      if (i % 60 === 59) expect(canonical(viewProjection(p.acc))).toBe(full(ev.slice(0, i + 1)));
    });
    expect(canonical(viewProjection(p.acc))).toBe(full(ev));
    expect(p.count).toBe(300);
    expect(p.last).toEqual({ ts: ev[299].ts, id: ev[299].id });
  });

  it.each(SEEDS.slice(0, 8))("semilla %s: applyNext nunca escribe en el acumulador anterior (congelado)", (seed) => {
    const ev = randomStream(`congelado-${seed}`, 250);
    let p: Projected = emptyProjected();
    ev.forEach((_, i) => {
      // Congelado a fondo (Map y Set incluidos): cualquier escritura fuera del borrador lanza un error.
      freeze(p.acc, true);
      const before = canonical(viewProjection(p.acc));
      p = dispatchLike(p, ev, i);
      expect(canonical(viewProjection(dispatchLike.prev!.acc))).toBe(before);
    });
    expect(canonical(viewProjection(p.acc))).toBe(full(ev));
  });
});

/**
 * Como dispatch() en el store: applyNext para cada evento; un deshacer recalcula todo desde
 * el principio (features/undo) y lo asienta, como hace finishProjection al pintarlo.
 */
function dispatchLike(p: Projected, ev: GameEvent[], i: number): Projected {
  dispatchLike.prev = p;
  if (ev[i].type !== "event_undone") return applyNext(p, ev[i]);
  const r = applyAll(emptyProjected(), ev.slice(0, i + 1));
  settleProjection(r.acc);
  return r;
}
dispatchLike.prev = undefined as Projected | undefined;

describe("applyNext comparte lo que no cambia", () => {
  const base = withMeta([
    { type: "quest_created", quest: questDef("a") },
    { type: "quest_created", quest: questDef("b") },
    { type: "temporal_created", temporal: temporalDef("t", { questIds: ["b"] }) },
  ]);
  const start = () => {
    const p = applyAll(emptyProjected(), base);
    return { p, state: finishProjection(p.acc) };
  };
  const next = (body: Record<string, unknown>) => ({ ...body, id: "z", deviceId: "test", ts: base[2].ts + 60_000 }) as GameEvent;

  it("un evento que no cambia nada devuelve el mismo acumulador", () => {
    const { p } = start();
    const after = applyNext(p, next({ type: "progress_added", questId: "no-existe", conditionId: "x", amount: 1 }));
    expect(after.acc).toBe(p.acc);
    expect(after.count).toBe(p.count + 1);
  });

  it("aceptar una quest copia esa quest y nada más; la vista reutiliza el resto", () => {
    const { p, state } = start();
    const after = applyNext(p, next({ type: "quest_accepted", questId: "a" }));
    expect(after.acc.quests).not.toBe(p.acc.quests);
    expect(after.acc.quests.get("a")).not.toBe(p.acc.quests.get("a"));
    expect(after.acc.quests.get("a")?.status).toBe("active");
    expect(p.acc.quests.get("a")?.status).toBe("available");
    expect(after.acc.quests.get("b")).toBe(p.acc.quests.get("b"));
    expect(after.acc.temporals).toBe(p.acc.temporals);
    expect(after.acc.items).toBe(p.acc.items);

    const view = viewProjection(after.acc, { acc: p.acc, state });
    expect(view).not.toBe(state);
    expect(view.quests).toBe(after.acc.quests);
    for (const k of ["items", "temporals", "gear", "chronicle", "agenda", "characters", "companion", "player"] as const) expect(view[k]).toBe(state[k]);
    expect(canonical(view)).toBe(full([...base, next({ type: "quest_accepted", questId: "a" })]));
  });

  it("si la vista no cambia, viewProjection devuelve el mismo estado", () => {
    const { p, state } = start();
    expect(viewProjection(p.acc, { acc: p.acc, state })).toBe(state);
  });
});

describe("finishProjection", () => {
  it("quita el encargo de una quest al desenlazarla o al cumplirlo", () => {
    const ev = withMeta([
      { type: "quest_created", quest: questDef("q") },
      { type: "temporal_created", temporal: temporalDef("t", { questIds: ["q"] }) },
    ]);
    const p = applyAll(emptyProjected(), ev);
    expect(finishProjection(p.acc).quests.get("q")?.temporalId).toBe("t");

    const unlink = withMeta([{ type: "temporal_unlinked", temporalId: "t", questId: "q" }], ev[1].ts + 1);
    const next = applyNext(p, unlink[0]);
    expect(viewProjection(next.acc).quests.get("q")?.temporalId).toBeUndefined();
    expect(p.acc.quests.get("q")?.temporalId).toBe("t");
    expect(canonical(viewProjection(next.acc))).toBe(full([...ev, ...unlink]));
  });
});

describe("valor de un encargo al cerrarse", () => {
  it("un encargo quemado se queda con el valor calculado, igual reproduciendo todo que evento a evento", () => {
    // El evento de creación trae 300 XP / 50 G; lo que vale de verdad lo calcula el juego.
    const ev = withMeta([
      { type: "quest_created", quest: questDef("q") },
      { type: "temporal_created", temporal: temporalDef("t", { questIds: ["q"], dueAt: T0 }) },
    ]);
    const burn = withMeta([{ type: "temporal_failed", temporalId: "t" }], T0 + 3 * DAY);
    const all = [...ev, ...burn];
    let p: Projected = emptyProjected();
    for (const e of all) p = applyNext(p, e);
    const stepwise = viewProjection(p.acc).temporals.get("t")!;
    const replay = project(all).temporals.get("t")!;
    expect(stepwise.status).toBe("done");
    expect(replay.reward).toEqual(stepwise.reward);
    expect(replay.reward).not.toEqual({ xp: 300, gold: 50 });
  });
});

describe("serialización", () => {
  it("conserva Map, Set, NaN e Infinity", () => {
    const p = applyAll(emptyProjected(), withMeta([{ type: "temporal_created", temporal: temporalDef("t") }]));
    p.acc.xp = NaN;
    p.acc.gold = Infinity;
    p.acc.items.deleted.add("x");
    const back = decodeSnapshot(encodeSnapshot(makeSnapshot(p, 5)!))!;
    expect(Number.isNaN(back.acc.xp)).toBe(true);
    expect(back.acc.gold).toBe(Infinity);
    expect(back.acc.items.deleted).toEqual(new Set(["x"]));
    expect(back.acc.temporals.board.get("t")?.title).toBe("Encargo t");
    expect(back.savedAt).toBe(5);
  });

  it("rechaza lo que no es un snapshot", () => {
    expect(decodeSnapshot(undefined)).toBeUndefined();
    expect(decodeSnapshot("")).toBeUndefined();
    expect(decodeSnapshot("{roto")).toBeUndefined();
    expect(decodeSnapshot('{"format":1}')).toBeUndefined();
    expect(decodeSnapshot("null")).toBeUndefined();
  });

  it("descarta los de otra versión de la proyección o del formato", () => {
    const s = makeSnapshot(applyAll(emptyProjected(), randomStream("v", 10)), 0)!;
    expect(isCurrent(s)).toBe(true);
    expect(isCurrent({ ...s, projection: PROJECTION_VERSION + 1 })).toBe(false);
    expect(isCurrent({ ...s, format: SNAPSHOT_FORMAT + 1 })).toBe(false);
  });

  it("sin eventos no hay snapshot", () => {
    expect(makeSnapshot(emptyProjected(), 0)).toBeUndefined();
  });
});

describe("goesAfter", () => {
  const last = { ts: 1000, id: "m" };
  it("detecta eventos que caen en medio del historial", () => {
    expect(goesAfter({}, { ts: 0, id: "a" })).toBe(true);
    expect(goesAfter({ last }, { ts: 1001, id: "a" })).toBe(true);
    expect(goesAfter({ last }, { ts: 1000, id: "z" })).toBe(true);
    expect(goesAfter({ last }, { ts: 1000, id: "m" })).toBe(false);
    expect(goesAfter({ last }, { ts: 1000, id: "a" })).toBe(false);
    expect(goesAfter({ last }, { ts: 999, id: "z" })).toBe(false);
  });
});

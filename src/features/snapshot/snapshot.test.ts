import { describe, expect, it } from "vitest";
import { comparePos, type GameEvent } from "../../domain/events";
import { finishProjection, project, PROJECTION_VERSION } from "../../domain/projection";
import { questDef, randomStream, temporalDef, withMeta } from "../../test/streams";
import {
  applyAll,
  canonical,
  cloneAcc,
  decodeSnapshot,
  emptyProjected,
  encodeSnapshot,
  goesAfter,
  isCurrent,
  makeSnapshot,
  SNAPSHOT_FORMAT,
  type Projected,
} from "./model";

const SEEDS = Array.from({ length: 25 }, (_, i) => `s${i}`);
const full = (events: GameEvent[]) => canonical(project(events));

/** Lo que haría el arranque: snapshot de los `k` primeros, guardado, leído y la cola encima. */
function viaSnapshot(events: GameEvent[], k: number): string {
  const head = applyAll(emptyProjected(), events.slice(0, k));
  const saved = makeSnapshot(head, 0);
  if (!saved) return canonical(finishProjection(applyAll(emptyProjected(), events).acc));
  const snap = decodeSnapshot(encodeSnapshot(saved))!;
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

  it.each(SEEDS)("semilla %s: aplicar evento a evento sobre copias (como dispatch) da el mismo estado", (seed) => {
    const ev = randomStream(seed, 300);
    let p: Projected = emptyProjected();
    for (const e of ev) p = applyAll({ ...p, acc: cloneAcc(p.acc) }, [e]);
    expect(canonical(finishProjection(p.acc))).toBe(full(ev));
    expect(p.count).toBe(300);
    expect(p.last).toEqual({ ts: ev[299].ts, id: ev[299].id });
  });

  it("dispatch no modifica el estado anterior", () => {
    const ev = randomStream("inmutable", 200);
    let p: Projected = emptyProjected();
    for (const e of ev) {
      const before = finishProjection(p.acc);
      const snapshotOfBefore = canonical(before);
      p = applyAll({ ...p, acc: cloneAcc(p.acc) }, [e]);
      finishProjection(p.acc);
      expect(canonical(before)).toBe(snapshotOfBefore);
    }
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
    const next = applyAll({ ...p, acc: cloneAcc(p.acc) }, unlink);
    expect(finishProjection(next.acc).quests.get("q")?.temporalId).toBeUndefined();
    expect(canonical(finishProjection(next.acc))).toBe(full([...ev, ...unlink]));
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

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EventStore } from "../../storage/eventStore";
import { comparePos, type GameEvent } from "../../domain/events";
import { finishProjection, project, PROJECTION_VERSION } from "../../domain/projection";
import { randomStream } from "../../test/streams";
import { applyAll, canonical, emptyProjected, makeSnapshot, type Snapshot } from "./model";

// El snapshot «guardado» vive en esta variable en lugar de SQLite o localStorage.
let saved: Snapshot | undefined;
vi.mock("./storage", () => ({
  readSnapshot: async () => saved && structuredClone(saved),
  writeSnapshot: async (s: Snapshot) => void (saved = structuredClone(s)),
}));
const { restore, rebuild, saveSnapshot, verifyAgainstFull } = await import("./restore");

/** EventStore en memoria que cuenta qué consultas se hacen. */
function memoryStore(events: GameEvent[]) {
  const calls = { all: 0, since: 0, countUpTo: 0 };
  const store: EventStore = {
    deviceId: "test",
    all: async () => (calls.all++, [...events]),
    since: async (pos) => (calls.since++, events.filter((e) => comparePos(e, pos) > 0)),
    countUpTo: async (pos) => (calls.countUpTo++, events.filter((e) => comparePos(e, pos) <= 0).length),
    byDevice: async (d) => events.filter((e) => e.deviceId === d),
    append: async (e) => void events.push(e),
    merge: async () => 0,
    unsynced: async () => [],
    markSynced: async () => {},
  };
  return { store, calls };
}

const ev = randomStream("restore-1", 250);
const stateOf = (acc: Parameters<typeof finishProjection>[0]) => canonical(finishProjection(acc));
const full = canonical(project(ev));

beforeEach(() => {
  saved = undefined;
});

describe("restore: arranque", () => {
  it("sin snapshot reproduce todo", async () => {
    const { store, calls } = memoryStore([...ev]);
    const r = await restore(store);
    expect(r).toMatchObject({ count: 250, snapCount: 0 });
    expect(calls).toMatchObject({ all: 1, since: 0 });
    expect(stateOf(r.acc)).toBe(full);
  });

  it("con un snapshot válido solo lee la cola", async () => {
    // Sin «deshacer»: uno en la cola obliga a reproducirlo todo (el test siguiente).
    const plain = ev.filter((e) => e.type !== "event_undone");
    const cut = plain.length - 50;
    await saveSnapshot(applyAll(emptyProjected(), plain.slice(0, cut)));
    const { store, calls } = memoryStore([...plain]);
    const r = await restore(store);
    expect(r).toMatchObject({ count: plain.length, snapCount: cut, last: { id: plain[plain.length - 1].id } });
    expect(calls).toMatchObject({ all: 0, since: 1, countUpTo: 1 });
    expect(stateOf(r.acc)).toBe(canonical(project(plain)));
  });

  it("un «deshacer» en la cola descarta el snapshot y lo reproduce todo", async () => {
    expect(ev.slice(200).some((e) => e.type === "event_undone")).toBe(true);
    await saveSnapshot(applyAll(emptyProjected(), ev.slice(0, 200)));
    const { store, calls } = memoryStore([...ev]);
    const r = await restore(store);
    expect(r).toMatchObject({ count: 250, snapCount: 0 });
    expect(calls).toMatchObject({ all: 1 });
    expect(stateOf(r.acc)).toBe(full);
  });

  it("un snapshot de otra versión de la proyección se descarta", async () => {
    saved = { ...makeSnapshot(applyAll(emptyProjected(), ev.slice(0, 200)), 0)!, projection: PROJECTION_VERSION + 1 };
    const { store, calls } = memoryStore([...ev]);
    const r = await restore(store);
    expect(r.snapCount).toBe(0);
    expect(calls.all).toBe(1);
    expect(stateOf(r.acc)).toBe(full);
  });

  it("si entra un evento antiguo (fusión de otro dispositivo), el recuento no cuadra y se recalcula", async () => {
    await saveSnapshot(applyAll(emptyProjected(), ev.slice(0, 200)));
    const old = { ...ev[10], id: "remoto", deviceId: "otro" } as GameEvent;
    const withOld = [...ev, old].sort(comparePos);
    const { store, calls } = memoryStore(withOld);
    const r = await restore(store);
    expect(r.snapCount).toBe(0);
    expect(calls.all).toBe(1);
    expect(stateOf(r.acc)).toBe(canonical(project(withOld)));
  });

  it("rebuild ignora el snapshot", async () => {
    await saveSnapshot(applyAll(emptyProjected(), ev.slice(0, 200)));
    const { store } = memoryStore([...ev]);
    expect((await rebuild(store)).snapCount).toBe(0);
  });
});

describe("verifyAgainstFull (solo en desarrollo)", () => {
  it("no dice nada si coincide y devuelve la completa si no", async () => {
    const { store } = memoryStore([...ev]);
    const good = applyAll(emptyProjected(), ev);
    expect(await verifyAgainstFull(store, good)).toBeUndefined();

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const bad = applyAll(emptyProjected(), ev);
    bad.acc.gold += 1000;
    const fixed = await verifyAgainstFull(store, bad);
    expect(spy).toHaveBeenCalledOnce();
    expect(stateOf(fixed!.acc)).toBe(full);
    spy.mockRestore();
  });
});

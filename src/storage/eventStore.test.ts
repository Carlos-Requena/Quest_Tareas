// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { openEventStore } from "./eventStore";
import { comparePos } from "../domain/events";
import { randomStream } from "../test/streams";

beforeEach(() => localStorage.clear());

describe("EventStore del navegador (localStorage)", () => {
  it("guarda el id del dispositivo una vez y lo reutiliza", async () => {
    const a = await openEventStore();
    const b = await openEventStore();
    expect(a.deviceId).toBe(b.deviceId);
    expect(localStorage.getItem("quests.deviceId")).toBe(a.deviceId);
  });

  it("all() devuelve los eventos ordenados aunque se añadan desordenados", async () => {
    const store = await openEventStore();
    const ev = randomStream("store", 60);
    for (const e of [...ev].reverse()) await store.append(e);
    expect((await store.all()).map((e) => e.id)).toEqual(ev.map((e) => e.id));
  });

  it("since y countUpTo parten el historial en dos sin perder ni repetir", async () => {
    const store = await openEventStore();
    const ev = randomStream("split", 120);
    for (const e of ev) await store.append(e);
    for (const k of [0, 1, 59, 119]) {
      const pos = { ts: ev[k].ts, id: ev[k].id };
      const head = await store.countUpTo(pos);
      const tail = await store.since(pos);
      expect(head).toBe(k + 1);
      expect(head + tail.length).toBe(120);
      expect(tail.every((e) => comparePos(e, pos) > 0)).toBe(true);
      expect(tail.map((e) => e.id)).toEqual(ev.slice(k + 1).map((e) => e.id));
    }
  });

  it("merge es idempotente: fusionar dos veces lo mismo no duplica", async () => {
    const store = await openEventStore();
    const ev = randomStream("merge", 30);
    await store.append(ev[0]);
    expect(await store.merge(ev)).toBe(29);
    expect(await store.merge(ev)).toBe(0);
    expect(await store.all()).toHaveLength(30);
    // Lo fusionado viene de otro dispositivo: ya está subido; lo local, no.
    expect((await store.unsynced()).map((e) => e.id)).toEqual([ev[0].id]);
    await store.markSynced([ev[0].id]);
    expect(await store.unsynced()).toEqual([]);
  });
});

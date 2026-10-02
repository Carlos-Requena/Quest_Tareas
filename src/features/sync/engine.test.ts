// @vitest-environment happy-dom
// La puerta de la fase 2: dos equipos que trabajaron sin conexión llegan al mismo estado.
// Cada «equipo» tiene su almacén en memoria; comparten un Google Drive falso.
import { describe, expect, it, vi } from "vitest";
import type { GameEvent } from "../../domain/events";
import { EVENT_VERSION } from "../../domain/events";
import { project } from "../../domain/projection";
import type { GameState } from "../../domain/types";
import { seedEvents, seedQuestId } from "../../domain/seed";
import { canonical } from "../snapshot/model";
import { liveBlobIds } from "../temporal/model";
import { gearBlobIds } from "../merchant/model";
import { fakeDrive, memoryBlobs, memoryEvents, toBase64 } from "../../test/memory";
import { MIN, randomStream, T0, temporalDef } from "../../test/streams";
import { runSync, type DriveApi } from "./engine";
import { emptyCursors, eventsFileName, type Cursors } from "./model";

vi.mock("../../lib/sfx", async () => (await import("../../test/sfxMock")).sfxMock());

/** Un equipo: su almacén, sus binarios, sus cursores y su estado proyectado. */
function device(name: string, drive: DriveApi, initial: GameEvent[] = []) {
  const events = memoryEvents(name, initial);
  const blobs = memoryBlobs();
  let cursors: Cursors = emptyCursors();
  let state: GameState = project([]);
  const refresh = async () => void (state = project(await events.all()));
  const merged = vi.fn(refresh);
  const sync = async () => {
    await refresh();
    return runSync({
      events,
      blobs,
      drive,
      readCursors: async () => structuredClone(cursors),
      writeCursors: async (c) => void (cursors = structuredClone(c)),
      onMerged: merged,
      usedBlobs: () => new Set([...liveBlobIds(state.temporals.values()), ...gearBlobIds(state.gear.values())]),
      now: () => T0,
    });
  };
  return { name, events, blobs, sync, merged, state: async () => canonical(project(await events.all())), ids: async () => (await events.all()).map((e) => e.id) };
}

/** Un historial aleatorio como si lo hubiera hecho el equipo `name` (sus ids y su deviceId). */
const workOn = (name: string, seed: string, n: number, start = T0): GameEvent[] =>
  randomStream(seed, n).map((e) => ({ ...e, id: `${name}-${e.id}`, deviceId: name, ts: e.ts - T0 + start }));

describe("dos equipos sin conexión llegan al mismo estado", () => {
  it.each(["s1", "s2", "s3", "s4", "s5", "s6"])("historiales aleatorios que se cruzan (semilla %s)", async (seed) => {
    const { api } = fakeDrive();
    // Los dos tocan las mismas quests (q0…q5) a la vez: aceptan, completan, compran con el mismo oro…
    const a = device("A", api, workOn("A", `${seed}a`, 300));
    const b = device("B", api, workOn("B", `${seed}b`, 300, T0 + 30 * MIN));
    await a.sync();
    await b.sync();
    await a.sync();
    expect(await a.ids()).toEqual(await b.ids());
    expect(await a.state()).toBe(await b.state());
    expect((await a.ids()).length).toBe(600);
  });

  it("el orden de las sincronizaciones no cambia el resultado", async () => {
    const runs = async (order: ("a" | "b" | "c")[]) => {
      const { api } = fakeDrive();
      const d = { a: device("A", api, workOn("A", "oa", 120)), b: device("B", api, workOn("B", "ob", 120, T0 + 5 * MIN)), c: device("C", api, workOn("C", "oc", 120, T0 + 9 * MIN)) };
      for (const k of order) await d[k].sync();
      for (const k of ["a", "b", "c"] as const) await d[k].sync();
      return Promise.all([d.a.state(), d.b.state(), d.c.state()]);
    };
    const x = await runs(["a", "b", "c"]);
    const y = await runs(["c", "a", "b", "c"]);
    expect(new Set([...x, ...y]).size).toBe(1);
  });

  it("una sincronización sin novedades no sube ni baja nada", async () => {
    const drive = fakeDrive();
    const a = device("A", drive.api, workOn("A", "idle", 40));
    const b = device("B", drive.api, workOn("B", "idle2", 40));
    await a.sync();
    await b.sync();
    await a.sync();
    const before = { ...drive.calls };
    const r = await a.sync();
    expect(r).toMatchObject({ pulled: 0, pushed: 0, blobsUp: 0, blobsDown: 0 });
    expect(drive.calls.upload).toBe(before.upload);
    expect(drive.calls.download).toBe(before.download);
    expect(a.merged).toHaveBeenCalledTimes(1); // solo la vez que llegó lo de B
  });

  it("cada equipo escribe solo su archivo", async () => {
    const drive = fakeDrive();
    const a = device("A", drive.api, workOn("A", "own", 30));
    const b = device("B", drive.api, workOn("B", "own2", 30));
    await a.sync();
    await b.sync();
    await a.sync();
    await b.sync();
    const names = drive.files.map((f) => f.name).sort();
    expect(names).toEqual([eventsFileName("A"), eventsFileName("B")]);
    const fileA = new TextDecoder().decode(drive.files.find((f) => f.name === eventsFileName("A"))!.bytes);
    expect(fileA.trim().split("\n").every((l) => JSON.parse(l).deviceId === "A")).toBe(true);
  });
});

describe("lo que pasa mientras se sincroniza", () => {
  it("un evento hecho durante la subida no se da por subido: va en la siguiente", async () => {
    const drive = fakeDrive();
    const a = device("A", drive.api, workOn("A", "race", 20));
    const late = { ...workOn("A", "late", 1)[0], id: "A-tarde", ts: T0 + 999 * MIN };
    const upload = drive.api.upload;
    drive.api.upload = async (req) => {
      const r = await upload(req);
      await a.events.append(late); // llega justo después de leer lo que había que subir
      drive.api.upload = upload;
      return r;
    };
    await a.sync();
    expect((await a.events.unsynced()).map((e) => e.id)).toEqual(["A-tarde"]);
    const r = await a.sync();
    expect(r.pushed).toBe(1);
    const b = device("B", drive.api);
    await b.sync();
    expect(await b.ids()).toContain("A-tarde");
  });

  it("si falla a medias, lo ya fusionado no se pierde y se reintenta lo demás", async () => {
    const drive = fakeDrive();
    const b = device("B", drive.api, workOn("B", "f1", 30));
    const c = device("C", drive.api, workOn("C", "f2", 30));
    await b.sync();
    await c.sync();
    const a = device("A", drive.api);
    const download = drive.api.download;
    let n = 0;
    drive.api.download = async (id) => {
      if (n++ === 1) throw { code: "network" };
      return download(id);
    };
    await expect(a.sync()).rejects.toEqual({ code: "network" });
    expect((await a.ids()).length).toBe(30); // el primer archivo sí entró
    drive.api.download = download;
    await a.sync();
    expect((await a.ids()).length).toBe(60);
  });
});

describe("archivos remotos dañados o ajenos", () => {
  it("salta las líneas rotas y las de otro equipo, sin perder las buenas", async () => {
    const drive = fakeDrive();
    const good = workOn("B", "bad", 3);
    const text = [JSON.stringify(good[0]), "{roto", JSON.stringify({ ...good[1], deviceId: "Z" }), JSON.stringify(good[2]), ""].join("\n");
    await drive.api.upload({ name: eventsFileName("B"), mime: "x", kind: "events", key: "B", text });
    const a = device("A", drive.api);
    const r = await a.sync();
    expect(r.rejected).toBe(2);
    expect(await a.ids()).toEqual([good[0].id, good[2].id]);
  });

  it("los eventos de una versión más nueva de la app viajan, pero no cambian el estado", async () => {
    const drive = fakeDrive();
    const b = device("B", drive.api, workOn("B", "fut", 20));
    await b.events.append({ ...workOn("B", "fut2", 1)[0], id: "B-futuro", v: EVENT_VERSION + 1, ts: T0 + 500 * MIN } as GameEvent);
    const before = await b.state();
    await b.sync();
    const a = device("A", drive.api);
    await a.sync();
    expect(await a.ids()).toContain("B-futuro");
    expect(await a.state()).toBe(before);
  });
});

describe("binarios: adjuntos y fondo del menú", () => {
  const attach = (name: string, blobId: string, ts: number): GameEvent[] => [
    { type: "temporal_created", temporal: temporalDef("t-doc"), id: `${name}-tc`, deviceId: name, ts },
    {
      type: "temporal_attached",
      temporalId: "t-doc",
      attachment: { id: "att", blobId, name: "receta.pdf", mime: "application/pdf", size: 4, addedAt: ts },
      id: `${name}-ta`,
      deviceId: name,
      ts: ts + 1,
    },
  ];

  it("un adjunto de un equipo llega al otro, una sola vez", async () => {
    const drive = fakeDrive();
    const a = device("A", drive.api);
    const id = await a.blobs.put(new Blob(["%PDF"], { type: "application/pdf" }));
    for (const e of attach("A", id, T0)) await a.events.append(e);
    expect((await a.sync()).blobsUp).toBe(1);
    const b = device("B", drive.api);
    expect((await b.sync()).blobsDown).toBe(1);
    expect(b.blobs.data.get(id)?.mime).toBe("application/pdf");
    expect(new TextDecoder().decode(b.blobs.data.get(id)!.bytes)).toBe("%PDF");
    // Ya está en los dos: no se vuelve a mover.
    expect(await a.sync()).toMatchObject({ blobsUp: 0, blobsDown: 0 });
    expect(await b.sync()).toMatchObject({ blobsUp: 0, blobsDown: 0 });
    expect(drive.files.filter((f) => f.appProperties.quests === "blob")).toHaveLength(1);
  });

  it("no sube binarios que ya no usa nada", async () => {
    const drive = fakeDrive();
    const a = device("A", drive.api, workOn("A", "orph", 10));
    await a.blobs.put(new Blob(["huérfano"]));
    expect((await a.sync()).blobsUp).toBe(0);
  });

  it("un binario de Drive que no coincide con su SHA-256 no se guarda", async () => {
    const drive = fakeDrive();
    const real = await memoryBlobs().put(new Blob(["bueno"]));
    await drive.api.upload({ name: `blob-${real}`, mime: "image/png", kind: "blob", key: real, base64: toBase64(new TextEncoder().encode("malo")) });
    const a = device("A", drive.api, attach("Z", real, T0).map((e) => ({ ...e, deviceId: "A", id: e.id.replace("Z", "A") })));
    const r = await a.sync();
    expect(r.blobsDown).toBe(0);
    expect(a.blobs.data.size).toBe(0);
  });
});

describe("datos de ejemplo de dos equipos que empiezan vacíos", () => {
  const seeded = (name: string, start: number): GameEvent[] =>
    seedEvents().map((body, i) => ({ ...body, id: `${name}-seed-${i}`, deviceId: name, ts: start + i }) as GameEvent);

  it("se juntan en uno: 5 quests y 10 objetos, no el doble", async () => {
    const drive = fakeDrive();
    const a = device("A", drive.api, seeded("A", T0));
    const b = device("B", drive.api, seeded("B", T0 + MIN));
    await a.sync();
    await b.sync();
    await a.sync();
    const s = project(await a.events.all());
    expect(s.quests.size).toBe(5);
    expect(s.items.size).toBe(10);
    expect(await a.state()).toBe(await b.state());
  });

  it("una quest de ejemplo retirada en un equipo no vuelve con los ejemplos de otro", async () => {
    const drive = fakeDrive();
    const del: GameEvent = { type: "quest_deleted", questId: seedQuestId("dragon"), id: "A-del", deviceId: "A", ts: T0 + MIN };
    const a = device("A", drive.api, [...seeded("A", T0), del]);
    await a.sync();
    // B se instala más tarde, crea sus ejemplos y se sincroniza.
    const b = device("B", drive.api, seeded("B", T0 + 60 * MIN));
    await b.sync();
    await a.sync();
    for (const d of [a, b]) expect(project(await d.events.all()).quests.has(seedQuestId("dragon"))).toBe(false);
    expect(await a.state()).toBe(await b.state());
  });
});

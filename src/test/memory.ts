// Solo para tests: almacenes en memoria y un Google Drive falso, para simular varios
// equipos que se sincronizan entre sí (features/sync/engine.test.ts).

import { compareEvents, comparePos, type GameEvent } from "../domain/events";
import type { EventStore } from "../storage/eventStore";
import { blobId } from "../storage/blobStore";
import type { DriveApi, SyncBlobs } from "../features/sync/engine";
import type { RemoteFile } from "../features/sync/model";

/** EventStore en memoria con la misma semántica que el de SQLite (merge idempotente, synced). */
export function memoryEvents(deviceId: string, initial: GameEvent[] = []): EventStore & { raw: Map<string, { e: GameEvent; synced: boolean }> } {
  const raw = new Map<string, { e: GameEvent; synced: boolean }>();
  for (const e of initial) raw.set(e.id, { e, synced: false });
  const sorted = () => [...raw.values()].map((r) => r.e).sort(compareEvents);
  return {
    raw,
    deviceId,
    all: async () => sorted(),
    since: async (pos) => sorted().filter((e) => comparePos(e, pos) > 0),
    countUpTo: async (pos) => sorted().filter((e) => comparePos(e, pos) <= 0).length,
    byDevice: async (d) => sorted().filter((e) => e.deviceId === d),
    append: async (e) => void (raw.has(e.id) || raw.set(e.id, { e, synced: false })),
    merge: async (events) => {
      let added = 0;
      for (const e of events) if (!raw.has(e.id)) (raw.set(e.id, { e, synced: true }), added++);
      return added;
    },
    unsynced: async () => sorted().filter((e) => !raw.get(e.id)!.synced),
    markSynced: async (ids) => ids.forEach((id) => raw.has(id) && (raw.get(id)!.synced = true)),
  };
}

export const toBase64 = (b: Uint8Array) => btoa(Array.from(b, (c) => String.fromCharCode(c)).join(""));
export const fromBase64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** Almacén de binarios en memoria, con el id por SHA-256 como el de verdad. */
export function memoryBlobs(): SyncBlobs & { data: Map<string, { mime: string; bytes: Uint8Array }> } {
  const data = new Map<string, { mime: string; bytes: Uint8Array }>();
  return {
    data,
    ids: async () => new Set(data.keys()),
    readBase64: async (id) => {
      const d = data.get(id);
      return d && { mime: d.mime, data: toBase64(d.bytes) };
    },
    put: async (blob) => {
      const id = await blobId(blob);
      data.set(id, { mime: blob.type, bytes: new Uint8Array(await blob.arrayBuffer()) });
      return id;
    },
    remove: async (id) => void data.delete(id),
  };
}

interface FakeFile extends RemoteFile {
  bytes: Uint8Array;
}

/** Google Drive falso, compartido por los «equipos» de un test. Cuenta subidas y bajadas. */
export function fakeDrive() {
  const files: FakeFile[] = [];
  const calls = { list: 0, upload: 0, download: 0 };
  let seq = 0;
  const pub = (f: FakeFile): RemoteFile => ({ id: f.id, name: f.name, mimeType: f.mimeType, version: f.version, appProperties: { ...f.appProperties } });
  const api: DriveApi = {
    list: async (kind) => (calls.list++, files.filter((f) => f.appProperties.quests === kind).map(pub)),
    download: async (id) => {
      calls.download++;
      const f = files.find((x) => x.id === id);
      if (!f) throw { code: "drive", status: 404 };
      return f.bytes.slice();
    },
    upload: async (req) => {
      calls.upload++;
      const bytes = req.text !== undefined ? new TextEncoder().encode(req.text) : fromBase64(req.base64 ?? "");
      if (req.fileId) {
        const f = files.find((x) => x.id === req.fileId);
        if (!f) throw { code: "drive", status: 404 };
        f.bytes = bytes;
        f.version = String(Number(f.version) + 1);
        return pub(f);
      }
      const f: FakeFile = { id: `file${++seq}`, name: req.name, mimeType: req.mime, version: "1", appProperties: { quests: req.kind, key: req.key }, bytes };
      files.push(f);
      return pub(f);
    },
  };
  return { api, files, calls };
}

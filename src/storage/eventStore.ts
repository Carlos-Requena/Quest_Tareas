import type Database from "@tauri-apps/plugin-sql";
import type { GameEvent } from "../domain/events";
import { compareEvents, comparePos, type EventPos } from "../domain/events";
import { uid } from "../lib/id";

/**
 * Almacén append-only de eventos. La fase 2 (sincronización con Google Drive)
 * solo necesita `unsynced()` para subir y `merge()` para incorporar los
 * eventos remotos de otros dispositivos.
 */
export interface EventStore {
  deviceId: string;
  all(): Promise<GameEvent[]>;
  /** Eventos posteriores a `pos` en el orden de la proyección (ts, id): la cola de un snapshot. */
  since(pos: EventPos): Promise<GameEvent[]>;
  /** Cuántos eventos hay hasta `pos`, incluido. Si no cuadra con el snapshot, este no vale. */
  countUpTo(pos: EventPos): Promise<number>;
  /** Los eventos que generó un equipo (los de este, para subirlos a su archivo de Drive). */
  byDevice(deviceId: string): Promise<GameEvent[]>;
  append(event: GameEvent): Promise<void>;
  /** Inserta eventos remotos ignorando los que ya existen. Devuelve cuántos eran nuevos. */
  merge(events: GameEvent[]): Promise<number>;
  unsynced(): Promise<GameEvent[]>;
  markSynced(ids: string[]): Promise<void>;
}

/** Filas por sentencia al insertar: 5 parámetros cada una, lejos del límite de SQLite (999 en las versiones antiguas). */
const BATCH = 150;

export const isTauri = () => "__TAURI_INTERNALS__" in window;

let sqlite: Promise<Database> | undefined;

/** Conexión única a quests.db: la comparten los eventos y los adjuntos (blobStore.ts). */
export function sqliteDb(): Promise<Database> {
  sqlite ??= import("@tauri-apps/plugin-sql").then(({ default: Db }) => Db.load("sqlite:quests.db"));
  return sqlite;
}

export async function openEventStore(): Promise<EventStore> {
  return isTauri() ? openSqliteStore() : openLocalStore();
}

async function openSqliteStore(): Promise<EventStore> {
  const db = await sqliteDb();
  await db.execute(`CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    ts INTEGER NOT NULL,
    body TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
  )`);
  await db.execute(`CREATE INDEX IF NOT EXISTS events_ts ON events (ts, id)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);

  const rows = await db.select<{ value: string }[]>(
    "SELECT value FROM meta WHERE key = 'device_id'",
  );
  let deviceId = rows[0]?.value;
  if (!deviceId) {
    deviceId = uid();
    await db.execute("INSERT INTO meta (key, value) VALUES ('device_id', $1)", [deviceId]);
  }

  type Row = { id: string; device_id: string; ts: number; body: string };
  const toEvent = (r: Row) =>
    ({ ...JSON.parse(r.body), id: r.id, deviceId: r.device_id, ts: r.ts }) as GameEvent;

  /** Inserta en lotes de BATCH filas por sentencia (una sentencia por evento era lenta al fusionar miles). */
  const insert = async (events: GameEvent[], synced: number) => {
    let added = 0;
    for (let i = 0; i < events.length; i += BATCH) {
      const chunk = events.slice(i, i + BATCH);
      const params: unknown[] = [];
      const rows = chunk.map((e, k) => {
        const { id, deviceId: dev, ts, ...body } = e;
        params.push(id, dev, ts, JSON.stringify(body), synced);
        const b = k * 5;
        return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5})`;
      });
      const res = await db.execute(`INSERT OR IGNORE INTO events (id, device_id, ts, body, synced) VALUES ${rows.join(", ")}`, params);
      added += res.rowsAffected;
    }
    return added;
  };

  return {
    deviceId,
    async all() {
      const r = await db.select<Row[]>("SELECT id, device_id, ts, body FROM events ORDER BY ts, id");
      return r.map(toEvent);
    },
    async since(pos) {
      const r = await db.select<Row[]>(
        "SELECT id, device_id, ts, body FROM events WHERE ts > $1 OR (ts = $1 AND id > $2) ORDER BY ts, id",
        [pos.ts, pos.id],
      );
      return r.map(toEvent);
    },
    async countUpTo(pos) {
      const r = await db.select<{ n: number }[]>(
        "SELECT count(*) AS n FROM events WHERE ts < $1 OR (ts = $1 AND id <= $2)",
        [pos.ts, pos.id],
      );
      return r[0]?.n ?? 0;
    },
    async byDevice(deviceId) {
      const r = await db.select<Row[]>("SELECT id, device_id, ts, body FROM events WHERE device_id = $1 ORDER BY ts, id", [deviceId]);
      return r.map(toEvent);
    },
    async append(e) {
      await insert([e], 0);
    },
    merge(events) {
      return insert(events, 1);
    },
    async unsynced() {
      const r = await db.select<Row[]>(
        "SELECT id, device_id, ts, body FROM events WHERE synced = 0 ORDER BY ts, id",
      );
      return r.map(toEvent);
    },
    async markSynced(ids) {
      for (let i = 0; i < ids.length; i += BATCH * 5) {
        const chunk = ids.slice(i, i + BATCH * 5);
        await db.execute(`UPDATE events SET synced = 1 WHERE id IN (${chunk.map((_, k) => `$${k + 1}`).join(", ")})`, chunk);
      }
    },
  };
}

/** Respaldo para ejecutar la UI en un navegador normal (pnpm dev) sin Tauri. */
async function openLocalStore(): Promise<EventStore> {
  const KEY = "quests.events";
  const SYNCED = "quests.synced";
  let deviceId = localStorage.getItem("quests.deviceId");
  if (!deviceId) {
    deviceId = uid();
    localStorage.setItem("quests.deviceId", deviceId);
  }
  const read = (): GameEvent[] => JSON.parse(localStorage.getItem(KEY) ?? "[]");
  const write = (ev: GameEvent[]) => localStorage.setItem(KEY, JSON.stringify(ev));
  const synced = (): Set<string> => new Set(JSON.parse(localStorage.getItem(SYNCED) ?? "[]"));
  const markSynced = async (ids: string[]) => {
    const s = synced();
    ids.forEach((id) => s.add(id));
    localStorage.setItem(SYNCED, JSON.stringify([...s]));
  };

  return {
    deviceId,
    async all() {
      return read().sort(compareEvents);
    },
    async since(pos) {
      return read()
        .filter((e) => comparePos(e, pos) > 0)
        .sort(compareEvents);
    },
    async countUpTo(pos) {
      return read().filter((e) => comparePos(e, pos) <= 0).length;
    },
    async byDevice(deviceId) {
      return read()
        .filter((e) => e.deviceId === deviceId)
        .sort(compareEvents);
    },
    async append(e) {
      write([...read(), e]);
    },
    async merge(events) {
      const cur = read();
      const ids = new Set(cur.map((e) => e.id));
      const fresh = events.filter((e) => !ids.has(e.id));
      write([...cur, ...fresh]);
      await markSynced(fresh.map((e) => e.id));
      return fresh.length;
    },
    async unsynced() {
      const s = synced();
      return read().filter((e) => !s.has(e.id));
    },
    markSynced,
  };
}

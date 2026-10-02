import { isTauri, sqliteDb } from "./eventStore";
import { uid } from "../lib/id";

/**
 * Almacén de archivos binarios (adjuntos en PDF o imagen de los encargos temporales).
 *
 * Los archivos NO van dentro de los eventos: un PDF de varios MB se leería en cada
 * arranque y reventaría el `localStorage` del navegador. El evento guarda solo una
 * referencia; el contenido vive aquí, direccionado por su SHA-256:
 * - el mismo archivo tiene el mismo id en todos los dispositivos (la fase 2 podrá
 *   sincronizarlos sin duplicados);
 * - guardar dos veces el mismo archivo no ocupa el doble.
 *
 * Tauri: tabla `blobs` en el mismo quests.db (sin plugins ni permisos nuevos).
 * Navegador (pnpm dev): IndexedDB, que sí admite archivos grandes.
 */
export interface BlobStore {
  /** Guarda el archivo y devuelve su id (SHA-256 en hexadecimal). */
  put(data: Blob): Promise<string>;
  get(id: string): Promise<Blob | undefined>;
  remove(id: string): Promise<void>;
  /** Ids de todo lo guardado (para saber qué falta subir o bajar, features/sync). */
  ids(): Promise<Set<string>>;
  /** El contenido en base64, tal como viaja por el puente con Rust (features/sync). */
  readBase64(id: string): Promise<{ mime: string; data: string } | undefined>;
}

let opened: Promise<BlobStore> | undefined;

export function openBlobStore(): Promise<BlobStore> {
  opened ??= isTauri() ? openSqliteBlobs() : openIdbBlobs();
  return opened;
}

/** SHA-256 del contenido. Sin `crypto.subtle` (contexto no seguro) cae en un id aleatorio. */
export async function blobId(data: Blob): Promise<string> {
  if (!crypto.subtle) return uid();
  const hash = await crypto.subtle.digest("SHA-256", await data.arrayBuffer());
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ───────────── SQLite (app nativa) ─────────────

async function openSqliteBlobs(): Promise<BlobStore> {
  const db = await sqliteDb();
  await db.execute(`CREATE TABLE IF NOT EXISTS blobs (
    id TEXT PRIMARY KEY,
    mime TEXT NOT NULL,
    size INTEGER NOT NULL,
    data TEXT NOT NULL,
    created INTEGER NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
  )`);

  return {
    async put(data) {
      const id = await blobId(data);
      // El puente JS↔Rust viaja en JSON: el binario va en base64.
      await db.execute("INSERT OR IGNORE INTO blobs (id, mime, size, data, created) VALUES ($1, $2, $3, $4, $5)", [
        id,
        data.type || "application/octet-stream",
        data.size,
        await toBase64(data),
        Date.now(),
      ]);
      return id;
    },
    async get(id) {
      const rows = await db.select<{ mime: string; data: string }[]>("SELECT mime, data FROM blobs WHERE id = $1", [id]);
      return rows[0] ? fromBase64(rows[0].data, rows[0].mime) : undefined;
    },
    async remove(id) {
      await db.execute("DELETE FROM blobs WHERE id = $1", [id]);
    },
    async ids() {
      const rows = await db.select<{ id: string }[]>("SELECT id FROM blobs");
      return new Set(rows.map((r) => r.id));
    },
    async readBase64(id) {
      const rows = await db.select<{ mime: string; data: string }[]>("SELECT mime, data FROM blobs WHERE id = $1", [id]);
      return rows[0];
    },
  };
}

function toBase64(data: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).slice(String(r.result).indexOf(",") + 1));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(data);
  });
}

function fromBase64(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// ───────────── IndexedDB (navegador) ─────────────

const IDB_NAME = "quests.blobs";
const IDB_STORE = "blobs";

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function openIdbBlobs(): Promise<BlobStore> {
  const open = indexedDB.open(IDB_NAME, 1);
  open.onupgradeneeded = () => open.result.createObjectStore(IDB_STORE, { keyPath: "id" });
  const db = await req(open);
  const store = (mode: IDBTransactionMode) => db.transaction(IDB_STORE, mode).objectStore(IDB_STORE);

  return {
    async put(data) {
      const id = await blobId(data);
      await req(store("readwrite").put({ id, mime: data.type, size: data.size, blob: data, created: Date.now() }));
      return id;
    },
    async get(id) {
      const rec = (await req(store("readonly").get(id))) as { blob: Blob } | undefined;
      return rec?.blob;
    },
    async remove(id) {
      await req(store("readwrite").delete(id));
    },
    async ids() {
      return new Set((await req(store("readonly").getAllKeys())) as string[]);
    },
    async readBase64(id) {
      const rec = (await req(store("readonly").get(id))) as { blob: Blob; mime: string } | undefined;
      return rec && { mime: rec.mime || rec.blob.type, data: await toBase64(rec.blob) };
    },
  };
}

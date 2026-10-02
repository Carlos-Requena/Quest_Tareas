// Modelo puro de la sincronización con Google Drive: sin React, store, Tauri ni red.
//
// Cada equipo escribe SOLO su archivo, events-<deviceId>.jsonl, con todos sus eventos (un
// JSON por línea). Los demás lo leen y lo fusionan con EventStore.merge, que ignora los
// que ya tienen. Como nunca hay dos escritores sobre el mismo archivo, no hay conflictos
// de escritura: el orden (reloj híbrido) y las guardas de la proyección hacen el resto.
//
// Los binarios (adjuntos y fondo del menú) van aparte, uno por archivo, blob-<SHA-256>.
// El nombre es su contenido, así que nunca cambian: se suben una vez y se bajan una vez.

import type { GameEvent } from "../../domain/events";
import { compareEvents } from "../../domain/events";

export const EVENTS_KIND = "events";
export const BLOB_KIND = "blob";
export const EVENTS_MIME = "application/x-ndjson";

/** Un archivo de Quests en Drive, como lo devuelve Rust (src-tauri/src/sync/drive.rs). */
export interface RemoteFile {
  id: string;
  name: string;
  mimeType?: string;
  /** Sube cada vez que cambia el archivo. */
  version?: string;
  modifiedTime?: string;
  size?: string;
  /** { quests: "events" | "blob", key: deviceId o SHA-256 }. */
  appProperties: Record<string, string>;
}

export const eventsFileName = (deviceId: string) => `events-${deviceId}.jsonl`;
export const blobFileName = (blobId: string) => `blob-${blobId}`;
export const keyOf = (f: RemoteFile) => f.appProperties?.key ?? "";

/** Hasta qué versión se leyó ya cada archivo de eventos de otro equipo (por id de archivo). */
export interface Cursors {
  files: Record<string, string>;
}

export const emptyCursors = (): Cursors => ({ files: {} });

/** Lo que se ve en la interfaz: en qué punto está y qué pasó la última vez. */
export type SyncPhase =
  /** Navegador (pnpm dev): solo la app de escritorio sincroniza. */
  | "unavailable"
  /** Compilada sin credencial de Google (google-client.json). */
  | "unconfigured"
  | "signedOut"
  | "signingIn"
  | "idle"
  | "syncing"
  | "error";

export interface SyncReport {
  /** Eventos nuevos que llegaron de otros equipos. */
  pulled: number;
  /** Eventos de este equipo que se subieron por primera vez. */
  pushed: number;
  blobsUp: number;
  blobsDown: number;
  /** Líneas de los archivos remotos que no se pudieron leer o no eran de su equipo. */
  rejected: number;
  at: number;
}

// ───────────── Archivo de eventos (JSONL) ─────────────

/** Los eventos de un equipo, en orden, un JSON por línea. */
export function encodeEvents(events: readonly GameEvent[]): string {
  return [...events]
    .sort(compareEvents)
    .map((e) => JSON.stringify(e))
    .join("\n")
    .concat(events.length ? "\n" : "");
}

const isEvent = (x: unknown): x is GameEvent => {
  if (!x || typeof x !== "object") return false;
  const e = x as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    e.id.length > 0 &&
    typeof e.deviceId === "string" &&
    typeof e.ts === "number" &&
    Number.isFinite(e.ts) &&
    typeof e.type === "string"
  );
};

/**
 * Lee el archivo de un equipo. Tolerante: una línea rota (archivo a medio subir, editado a
 * mano) se salta y se cuenta, sin perder las demás. Solo se aceptan eventos de ESE equipo:
 * cada uno escribe solo los suyos.
 */
export function decodeEvents(text: string, deviceId: string): { events: GameEvent[]; rejected: number } {
  const events: GameEvent[] = [];
  let rejected = 0;
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const e: unknown = JSON.parse(line);
      if (isEvent(e) && e.deviceId === deviceId) events.push(e);
      else rejected++;
    } catch {
      rejected++;
    }
  }
  return { events, rejected };
}

// ───────────── Qué hacer en cada sincronización ─────────────

export interface EventsPlan {
  /** Archivos de otros equipos que han cambiado desde la última lectura. */
  download: RemoteFile[];
  /** El archivo de este equipo, si ya existe. */
  own?: RemoteFile;
  /** Hay que (re)subir el archivo de este equipo: hay eventos sin subir o el archivo no está. */
  upload: boolean;
}

export function planEvents(remote: readonly RemoteFile[], deviceId: string, cursors: Cursors, unsynced: number): EventsPlan {
  // Si hubiera dos archivos de este equipo, vale el más antiguo (Rust los lista por fecha de creación).
  const own = remote.find((f) => keyOf(f) === deviceId);
  const download = remote.filter((f) => keyOf(f) && keyOf(f) !== deviceId && cursors.files[f.id] !== f.version);
  return { download, own, upload: !own || unsynced > 0 };
}

export interface BlobsPlan {
  /** Ids que este equipo tiene, se usan y no están en Drive. */
  upload: string[];
  /** Archivos de Drive que se usan y faltan en este equipo. */
  download: RemoteFile[];
}

/** Solo se mueven los binarios que usa algún encargo o pieza; los huérfanos se quedan donde están. */
export function planBlobs(used: ReadonlySet<string>, local: ReadonlySet<string>, remote: readonly RemoteFile[]): BlobsPlan {
  const remoteByKey = new Map<string, RemoteFile>();
  for (const f of remote) if (keyOf(f) && !remoteByKey.has(keyOf(f))) remoteByKey.set(keyOf(f), f);
  const upload = [...used].filter((id) => local.has(id) && !remoteByKey.has(id)).sort();
  const download = [...used]
    .filter((id) => !local.has(id) && remoteByKey.has(id))
    .sort()
    .map((id) => remoteByKey.get(id)!);
  return { upload, download };
}

/** Cada cuánto se sincroniza sola mientras la app está abierta. */
export const SYNC_EVERY_MS = 5 * 60_000;
/** Lo que se espera a la última sincronización al cerrar la ventana. */
export const CLOSE_TIMEOUT_MS = 8_000;

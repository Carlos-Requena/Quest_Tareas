// Una sincronización completa, con todo lo de fuera inyectado (almacenes, Drive, cursores).
// Así se prueba con dos «equipos» en memoria y un Drive falso (engine.test.ts), y la app
// le pasa los de verdad (actions.ts).

import type { EventStore } from "../../storage/eventStore";
import {
  BLOB_KIND,
  blobFileName,
  decodeEvents,
  encodeEvents,
  EVENTS_KIND,
  EVENTS_MIME,
  eventsFileName,
  keyOf,
  planBlobs,
  planEvents,
  type Cursors,
  type RemoteFile,
  type SyncReport,
} from "./model";

/** Lo que hace Rust con Drive (drive.ts). */
export interface DriveApi {
  list(kind: string): Promise<RemoteFile[]>;
  download(fileId: string): Promise<Uint8Array>;
  upload(req: { fileId?: string; name: string; mime: string; kind: string; key: string; text?: string; base64?: string }): Promise<RemoteFile>;
}

/** La parte del almacén de binarios que necesita la sincronización. */
export interface SyncBlobs {
  ids(): Promise<Set<string>>;
  readBase64(id: string): Promise<{ mime: string; data: string } | undefined>;
  /** Guarda el archivo y devuelve el id que le corresponde por su contenido. */
  put(data: Blob): Promise<string>;
  remove(id: string): Promise<void>;
}

export interface SyncDeps {
  events: EventStore;
  blobs: SyncBlobs;
  drive: DriveApi;
  readCursors(): Promise<Cursors>;
  writeCursors(c: Cursors): Promise<void>;
  /** Tras fusionar eventos nuevos: recalcular el estado (store.rebuild). */
  onMerged(): Promise<void>;
  /** Binarios que usa el estado actual (encargos y fondo del menú), ya con lo fusionado. */
  usedBlobs(): Set<string>;
  now(): number;
}

const decoder = new TextDecoder();

export async function runSync(deps: SyncDeps): Promise<SyncReport> {
  const { events, drive } = deps;
  const me = events.deviceId;
  const report: SyncReport = { pulled: 0, pushed: 0, blobsUp: 0, blobsDown: 0, rejected: 0, at: 0 };

  // 1) Bajar lo nuevo de los demás equipos.
  const remote = await drive.list(EVENTS_KIND);
  const cursors = await deps.readCursors();
  // Se leen ANTES de subir: lo que se haga mientras sube sigue sin marcar y se sube la próxima vez.
  const unsynced = await events.unsynced();
  const plan = planEvents(remote, me, cursors, unsynced.length);

  for (const f of plan.download) {
    const { events: theirs, rejected } = decodeEvents(decoder.decode(await drive.download(f.id)), keyOf(f));
    report.pulled += await events.merge(theirs);
    report.rejected += rejected;
    // El cursor se guarda archivo a archivo: si algo falla a medias, no se vuelve a leer lo ya fusionado.
    if (f.version !== undefined) cursors.files[f.id] = f.version;
    await deps.writeCursors(cursors);
  }
  if (report.pulled > 0) await deps.onMerged();

  // 2) Subir el archivo de este equipo, entero, si tiene algo nuevo.
  if (plan.upload) {
    const mine = await events.byDevice(me);
    await drive.upload({
      fileId: plan.own?.id,
      name: eventsFileName(me),
      mime: EVENTS_MIME,
      kind: EVENTS_KIND,
      key: me,
      text: encodeEvents(mine),
    });
    await events.markSynced(unsynced.map((e) => e.id));
    report.pushed = unsynced.length;
  }

  // 3) Binarios: subir los que faltan en Drive y bajar los que faltan aquí.
  const local = await deps.blobs.ids();
  const blobPlan = planBlobs(deps.usedBlobs(), local, await drive.list(BLOB_KIND));
  for (const id of blobPlan.upload) {
    const b = await deps.blobs.readBase64(id);
    if (!b) continue;
    await drive.upload({ name: blobFileName(id), mime: b.mime, kind: BLOB_KIND, key: id, base64: b.data });
    report.blobsUp++;
  }
  for (const f of blobPlan.download) {
    const bytes = await drive.download(f.id);
    const id = await deps.blobs.put(new Blob([bytes as BlobPart], { type: f.mimeType ?? "" }));
    // El id es el SHA-256 del contenido: si no coincide, el archivo de Drive está dañado y no se guarda.
    if (id === keyOf(f)) report.blobsDown++;
    else {
      console.warn(`[sync] el binario ${keyOf(f)} de Drive no coincide con su contenido`);
      // Se quita lo recién guardado, salvo que ya estuviera (otro archivo con ese mismo contenido).
      if (!local.has(id)) await deps.blobs.remove(id);
    }
  }

  report.at = deps.now();
  return report;
}

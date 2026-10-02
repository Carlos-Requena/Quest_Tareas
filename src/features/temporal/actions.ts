import { useGame } from "../../store/game";
import { uid } from "../../lib/id";
import { sfx } from "../../lib/sfx";
import i18n from "../../i18n";
import { openBlobStore } from "../../storage/blobStore";
import {
  TEMPORAL_KINDS,
  TEMPORAL_LIMITS,
  clampSkulls,
  clampText,
  liveBlobIds,
  suggestedReward,
  type AttachmentRef,
  type TemporalDef,
  type TemporalKind,
  type TemporalPatch,
} from "./model";
import type { PreparedFile } from "./files";
import { useTemporalUi } from "./ui";

/** Lo que rellena el formulario de encargo. */
export interface TemporalDraft {
  title: string;
  kind: TemporalKind;
  difficulty: number;
  /** AAAA-MM-DD (input de fecha). */
  date: string;
  /** HH:MM; vacío = todo el día. */
  time: string;
  place: string;
  notes: string;
  xp: number;
  gold: number;
  /** Adjuntos ya guardados (al editar). */
  attachments: AttachmentRef[];
  /** Archivos nuevos elegidos en el formulario. */
  files: PreparedFile[];
}

const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Fecha y hora del formulario → ms locales. NaN si la fecha no es válida. */
export function dueAtOf(date: string, time: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return NaN;
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  return new Date(+m[1], +m[2] - 1, +m[3], t ? +t[1] : 0, t ? +t[2] : 0).getTime();
}

/** Borrador nuevo: mañana a las 10:00, una calavera. */
export function emptyDraft(now = Date.now()): TemporalDraft {
  const tomorrow = new Date(now + 86_400_000);
  return {
    title: "",
    kind: "summons",
    difficulty: 1,
    date: isoDate(tomorrow),
    time: "10:00",
    place: "",
    notes: "",
    ...suggestedReward(1),
    attachments: [],
    files: [],
  };
}

export function draftOf(t: TemporalDef): TemporalDraft {
  const d = new Date(t.dueAt);
  return {
    title: t.title,
    kind: t.kind,
    difficulty: t.difficulty,
    date: isoDate(d),
    time: t.allDay ? "" : `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    place: t.place,
    notes: t.notes,
    xp: t.reward.xp,
    gold: t.reward.gold,
    attachments: t.attachments,
    files: [],
  };
}

/** Valida y normaliza. Sin título o sin fecha no hay encargo. */
function clean(d: TemporalDraft): Omit<TemporalDef, "id" | "createdAt" | "attachments"> | undefined {
  const title = clampText(d.title, TEMPORAL_LIMITS.title);
  const dueAt = dueAtOf(d.date, d.time);
  if (!title || !Number.isFinite(dueAt) || !TEMPORAL_KINDS.includes(d.kind)) return undefined;
  return {
    title,
    kind: d.kind,
    difficulty: clampSkulls(d.difficulty),
    dueAt,
    allDay: !d.time,
    place: clampText(d.place, TEMPORAL_LIMITS.place),
    notes: clampText(d.notes, TEMPORAL_LIMITS.notes),
    reward: { xp: Math.max(0, Math.round(d.xp) || 0), gold: Math.max(0, Math.round(d.gold) || 0) },
  };
}

export const isValidDraft = (d: TemporalDraft) => clean(d) !== undefined;

/** Guarda los binarios y devuelve las referencias que irán en los eventos. */
async function storeFiles(files: PreparedFile[]): Promise<AttachmentRef[]> {
  if (!files.length) return [];
  const blobs = await openBlobStore();
  const out: AttachmentRef[] = [];
  for (const f of files) {
    const blobId = await blobs.put(f.blob);
    out.push({ id: uid(), blobId, name: f.name, mime: f.mime, size: f.size, thumb: f.thumb, addedAt: Date.now() });
  }
  return out;
}

/** Borra del almacén los binarios que ya no usa ningún encargo. */
async function collect(candidates: string[]) {
  if (!candidates.length) return;
  const live = liveBlobIds(useGame.getState().state.temporals.values());
  const blobs = await openBlobStore();
  for (const id of new Set(candidates)) if (!live.has(id)) await blobs.remove(id);
}

function fail(err: unknown) {
  console.error(err);
  sfx.cancel();
  useGame.getState().say(() => i18n.t("temporal.toast.fileError"));
}

/** Clava un encargo nuevo en el tablón y lanza la animación de «cartel clavado». */
export async function createTemporal(d: TemporalDraft): Promise<boolean> {
  const fields = clean(d);
  if (!fields) return false;
  let attachments: AttachmentRef[];
  try {
    attachments = await storeFiles(d.files.slice(0, TEMPORAL_LIMITS.attachments));
  } catch (err) {
    fail(err);
    return false;
  }
  const temporal: TemporalDef = { ...fields, id: uid(), attachments, createdAt: Date.now() };
  const { dispatch, say } = useGame.getState();
  await dispatch({ type: "temporal_created", temporal });
  const ui = useTemporalUi.getState();
  ui.setForm(undefined);
  ui.select(temporal.id);
  ui.setPosted(temporal.id);
  say(() => i18n.t("temporal.toast.posted", { title: temporal.title }));
  return true;
}

/** Edita un encargo pendiente: un parche con los campos que cambian y un evento por adjunto añadido o quitado. */
export async function updateTemporal(id: string, d: TemporalDraft): Promise<boolean> {
  const { state, dispatch, say } = useGame.getState();
  const cur = state.temporals.get(id);
  const fields = clean(d);
  if (cur?.status !== "pending" || !fields) return false;

  const patch: TemporalPatch = {};
  for (const k of Object.keys(fields) as (keyof typeof fields)[]) {
    if (JSON.stringify(fields[k]) !== JSON.stringify(cur[k])) Object.assign(patch, { [k]: fields[k] });
  }
  const keep = new Set(d.attachments.map((a) => a.id));
  const removed = cur.attachments.filter((a) => !keep.has(a.id));
  const room = TEMPORAL_LIMITS.attachments - (cur.attachments.length - removed.length);

  let added: AttachmentRef[];
  try {
    added = await storeFiles(d.files.slice(0, Math.max(0, room)));
  } catch (err) {
    fail(err);
    return false;
  }
  if (Object.keys(patch).length) await dispatch({ type: "temporal_updated", temporalId: id, patch });
  for (const a of removed) await dispatch({ type: "temporal_detached", temporalId: id, attachmentId: a.id });
  for (const a of added) await dispatch({ type: "temporal_attached", temporalId: id, attachment: a });
  await collect(removed.map((a) => a.blobId));

  useTemporalUi.getState().setForm(undefined);
  sfx.tick();
  say(() => i18n.t("temporal.toast.updated", { title: fields.title }));
  return true;
}

/** Adjunta archivos a un encargo ya clavado (también a uno cumplido: el justificante llega después). */
export async function attachFiles(id: string, files: PreparedFile[]) {
  const { state, dispatch, say } = useGame.getState();
  const t = state.temporals.get(id);
  if (!t || !files.length) return;
  const room = TEMPORAL_LIMITS.attachments - t.attachments.length;
  if (room <= 0) {
    sfx.cancel();
    say(() => i18n.t("temporal.toast.tooMany", { n: TEMPORAL_LIMITS.attachments }));
    return;
  }
  try {
    for (const a of await storeFiles(files.slice(0, room))) await dispatch({ type: "temporal_attached", temporalId: id, attachment: a });
  } catch (err) {
    fail(err);
    return;
  }
  sfx.pin();
  say(() => i18n.t("temporal.toast.attached", { count: Math.min(room, files.length) }));
}

export async function detachAttachment(id: string, attachmentId: string) {
  const { state, dispatch } = useGame.getState();
  const a = state.temporals.get(id)?.attachments.find((x) => x.id === attachmentId);
  if (!a) return;
  sfx.paperRip(0.4);
  await dispatch({ type: "temporal_detached", temporalId: id, attachmentId });
  await collect([a.blobId]);
}

/** Cumple el encargo: copia la recompensa en el evento y lanza la animación de «logro». */
export async function completeTemporal(id: string) {
  const { state, dispatch, say } = useGame.getState();
  const t = state.temporals.get(id);
  if (t?.status !== "pending") return;
  const before = state.player;
  const reward = { ...t.reward };
  await dispatch({ type: "temporal_completed", temporalId: id, reward });
  const ui = useTemporalUi.getState();
  ui.closeView();
  ui.setCleared({ temporalId: id, before, after: useGame.getState().state.player, reward });
  say(() => i18n.t("temporal.toast.completed", { title: t.title }));
}

/** Retira el cartel del tablón (y sus archivos, si nadie más los usa). */
export async function deleteTemporal(id: string) {
  const { state, dispatch, say } = useGame.getState();
  const t = state.temporals.get(id);
  if (!t) return;
  sfx.paperRip(1);
  const ui = useTemporalUi.getState();
  ui.closeView();
  if (ui.selectedId === id) ui.select(undefined);
  await dispatch({ type: "temporal_deleted", temporalId: id });
  await collect(t.attachments.map((a) => a.blobId));
  say(() => i18n.t("temporal.toast.deleted", { title: t.title }));
}

/** Lee el contenido de un adjunto. `undefined` si este equipo no tiene el archivo. */
export async function loadAttachment(a: AttachmentRef): Promise<Blob | undefined> {
  return (await openBlobStore()).get(a.blobId);
}

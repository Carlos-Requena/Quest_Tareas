import { useGame } from "../../store/game";
import { uid } from "../../lib/id";
import { sfx } from "../../lib/sfx";
import i18n from "../../i18n";
import { openBlobStore } from "../../storage/blobStore";
import type { QuestDef, QuestState } from "../../domain/types";
import { gearBlobIds } from "../merchant/model";
import { characterBlobIds } from "../menu/model";
import { questReward, questValue, temporalValue, type Reward } from "../rewards/model";
import {
  TEMPORAL_KINDS,
  TEMPORAL_LIMITS,
  clampSkulls,
  clampText,
  isAccepted,
  liveBlobIds,
  pendingLinks,
  type AttachmentRef,
  type TemporalDef,
  type TemporalKind,
  type TemporalPatch,
  type TemporalState,
} from "./model";
import type { PreparedFile } from "./files";
import { useTemporalUi } from "./ui";
import { offerUndo } from "../undo/actions";
import { UNDO_WINDOW_MS } from "../undo/model";
import { useHorizonUi } from "../horizon/ui";
import { cleanContacts, type ContactRef } from "../contacts/model";

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
  /** Adjuntos ya guardados (al editar). */
  attachments: AttachmentRef[];
  /** Archivos nuevos elegidos en el formulario. */
  files: PreparedFile[];
  /** Quests del tablón ya enlazadas (o elegidas para enlazar), en orden. */
  questIds: string[];
  /** Quests nuevas que se crearán en el Quest Board al guardar. */
  newQuests: QuestSeed[];
  /** Quests nuevas hechas con el formulario completo del Quest Board: se publican al guardar. */
  fullQuests: QuestDef[];
  /** En cadena: cada quest nueva requiere la anterior de la lista. */
  chain: boolean;
  /** Solo al clavarlo: aceptarlo ya. Si no, se clava sin aceptar y sus quests quedan en reserva. */
  accept: boolean;
  /** A quién llamar o escribir, o dónde ir (features/contacts). */
  contacts: ContactRef[];
}

/** Quest nueva escrita en el formulario del encargo: un título y cuántas veces hay que hacerla. */
export interface QuestSeed {
  key: string;
  title: string;
  target: number;
}

export const newQuestSeed = (): QuestSeed => ({ key: uid(), title: "", target: 1 });

const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Fecha y hora del formulario → ms locales. NaN si la fecha no es válida. */
export function dueAtOf(date: string, time: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return NaN;
  const t = /^(\d{2}):(\d{2})$/.exec(time);
  return new Date(+m[1], +m[2] - 1, +m[3], t ? +t[1] : 0, t ? +t[2] : 0).getTime();
}

/** Borrador nuevo: mañana (o el día elegido en el calendario) a las 10:00, una calavera. */
export function emptyDraft(now = Date.now(), date?: string): TemporalDraft {
  const tomorrow = new Date(now + 86_400_000);
  return {
    title: "",
    kind: "summons",
    difficulty: 1,
    date: date ?? isoDate(tomorrow),
    time: "10:00",
    place: "",
    notes: "",
    attachments: [],
    files: [],
    questIds: [],
    newQuests: [],
    fullQuests: [],
    chain: false,
    accept: false,
    contacts: [],
  };
}

/** Borrador para editar. Las quests enlazadas que ya no existen se quedan fuera (y se desenlazan al guardar). */
export function draftOf(t: TemporalDef, quests?: Map<string, QuestState>): TemporalDraft {
  const d = new Date(t.dueAt);
  return {
    title: t.title,
    kind: t.kind,
    difficulty: t.difficulty,
    date: isoDate(d),
    time: t.allDay ? "" : `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    place: t.place,
    notes: t.notes,
    attachments: t.attachments,
    files: [],
    questIds: quests ? t.questIds.filter((id) => quests.has(id)) : t.questIds,
    newQuests: [],
    fullQuests: [],
    chain: false,
    accept: false,
    contacts: t.contacts ?? [],
  };
}

/**
 * Borrador para volver a clavar un encargo quemado (features/failure): lo mismo con fecha
 * nueva (mañana, a la misma hora) y sus quests perdidas como quests nuevas, sin aceptar.
 * Los adjuntos no se copian: siguen en el cartel quemado.
 */
export function copyDraft(t: TemporalState, quests: Map<string, QuestState>, now = Date.now()): TemporalDraft {
  const base = draftOf(t);
  const lost = t.questIds.map((id) => quests.get(id)).filter((q): q is QuestState => !!q && q.failedAt !== undefined);
  return {
    ...base,
    date: isoDate(new Date(now + 86_400_000)),
    attachments: [],
    questIds: [],
    fullQuests: lost.map((q) => ({ ...questDefOf(q), id: uid(), dueAt: undefined, createdAt: now })),
  };
}

/** La definición de una quest (sin su estado de juego). */
function questDefOf(q: QuestState): QuestDef {
  const { id, title, category, description, client, area, kind, conditions, reward, cooldownMinutes, repeatDays, requires, dueAt, contacts, createdAt } = q;
  return { id, title, category, description, client, area, kind, conditions, reward, cooldownMinutes, repeatDays, requires, dueAt, contacts, createdAt };
}

/** Quest de un objetivo («título ×N») escrita en el formulario del encargo, sin id ni fecha todavía. */
const seedConditions = (s: QuestSeed, title: string): QuestDef["conditions"] => [
  { id: uid(), kind: "count", label: title, target: Math.max(1, Math.min(999, Math.round(s.target) || 1)) },
];

/**
 * Lo que valdrá el encargo con las quests del borrador: las ya enlazadas, las
 * rápidas («título ×N», encargos) y las hechas con el formulario completo (features/rewards).
 */
export function draftReward(d: TemporalDraft, quests: Map<string, QuestState>): Reward {
  const linked = d.questIds.flatMap((id) => quests.get(id)?.reward ?? []);
  const seeds = usableSeeds(d).map((s) => questValue({ category: "request", conditions: seedConditions(s, s.title) }));
  const full = d.fullQuests.map(questValue);
  return temporalValue(d.difficulty, [...linked, ...seeds, ...full]);
}

/** Valida y normaliza. Sin título o sin fecha no hay encargo. */
function clean(d: TemporalDraft): Omit<TemporalDef, "id" | "createdAt" | "attachments" | "questIds" | "planned"> | undefined {
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
    // Los vacíos se quedan fuera (features/contacts).
    contacts: cleanContacts(d.contacts),
    // Calculada (features/rewards): la proyección la recalcula si cambian sus quests.
    reward: draftReward(d, useGame.getState().state.quests),
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

/** Borra del almacén los binarios que ya no usa ningún encargo (ni el fondo del mercader ni los personajes del menú, que comparten almacén). */
async function collect(candidates: string[]) {
  if (!candidates.length) return;
  const { state } = useGame.getState();
  const live = liveBlobIds(state.temporals.values());
  for (const id of gearBlobIds(state.gear.values())) live.add(id);
  for (const id of characterBlobIds(state.characters.values())) live.add(id);
  const blobs = await openBlobStore();
  for (const id of new Set(candidates)) if (!live.has(id)) await blobs.remove(id);
}

function fail(err: unknown) {
  console.error(err);
  sfx.cancel();
  useGame.getState().say(() => i18n.t("temporal.toast.fileError"));
}

/** Quests rápidas con título, dentro del límite de quests de un encargo. */
const usableSeeds = (d: TemporalDraft) =>
  d.newQuests.filter((q) => q.title.trim()).slice(0, Math.max(0, TEMPORAL_LIMITS.quests - d.questIds.length - d.fullQuests.length));

/**
 * Crea en el Quest Board las quests nuevas del formulario: primero las hechas con el
 * formulario completo y después las rápidas («título ×N», encargos de un objetivo).
 * En cadena, cada una requiere la anterior de la lista (`prev` es la última ya
 * enlazada, si la hay).
 */
async function createDraftQuests(d: TemporalDraft, event: { title: string; place: string }, prev?: string): Promise<string[]> {
  const { dispatch } = useGame.getState();
  const full = d.fullQuests.slice(0, Math.max(0, TEMPORAL_LIMITS.quests - d.questIds.length));
  const seeds = usableSeeds(d).map((s): QuestDef => {
    const title = s.title.trim().slice(0, TEMPORAL_LIMITS.title);
    const conditions = seedConditions(s, title);
    return {
      id: uid(),
      title,
      category: "request",
      client: event.title,
      area: event.place,
      kind: "",
      description: "",
      conditions,
      reward: questReward({ category: "request", conditions }),
      createdAt: Date.now(),
    };
  });
  const ids: string[] = [];
  for (const q of [...full, ...seeds]) {
    const requires = d.chain && prev ? [...new Set([...(q.requires ?? []), prev])] : q.requires;
    await dispatch({ type: "quest_created", quest: { ...q, requires, createdAt: Date.now() } });
    ids.push(q.id);
    prev = q.id;
  }
  return ids;
}

/** Clava un encargo nuevo en el tablón (con sus quests) y lanza la animación de «cartel clavado». */
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
  // Primero las quests (así el encargo nace enlazado a ellas) y después el encargo.
  const linked = d.questIds.slice(0, TEMPORAL_LIMITS.quests);
  const created = await createDraftQuests(d, fields, linked[linked.length - 1]);
  const temporal: TemporalDef = {
    ...fields,
    id: uid(),
    attachments,
    questIds: [...linked, ...created],
    createdAt: Date.now(),
    // Sin aceptar, sus quests esperan en reserva hasta que lo aceptes.
    ...(d.accept ? {} : { planned: true }),
  };
  const { dispatch, say } = useGame.getState();
  await dispatch({ type: "temporal_created", temporal });
  const ui = useTemporalUi.getState();
  ui.setForm(undefined);
  ui.select(temporal.id);
  ui.setPosted(temporal.id);
  // Que el cartel nuevo se vea al llegar al tablón, sea cual sea el plazo o la aceptación elegidos.
  useHorizonUi.getState().setFilter("temporal", "all");
  if (ui.accept !== (d.accept ? "accepted" : "planned")) ui.setAccept("all");
  const quests = temporal.questIds.length;
  say(() =>
    !d.accept && quests
      ? i18n.t("temporal.toast.questsReserved", { title: temporal.title, count: quests })
      : created.length
        ? i18n.t("temporal.toast.questsCreated", { title: temporal.title, count: created.length })
        : i18n.t("temporal.toast.posted", { title: temporal.title }),
  );
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
    // La recompensa es calculada (features/rewards): la proyección la sigue sola.
    if (k === "reward") continue;
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

  // Quests: desenlazar las quitadas (siguen en el Quest Board), enlazar las elegidas y crear las nuevas.
  const keepQuests = new Set(d.questIds);
  for (const q of cur.questIds) if (!keepQuests.has(q)) await dispatch({ type: "temporal_unlinked", temporalId: id, questId: q });
  const linked = d.questIds.filter((q) => !cur.questIds.includes(q));
  const created = await createDraftQuests(d, fields, d.questIds[d.questIds.length - 1]);
  for (const q of [...linked, ...created]) await dispatch({ type: "temporal_linked", temporalId: id, questId: q });

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

/** Acepta un encargo: sus quests salen de la reserva al Quest Board y ya se puede cumplir. */
export async function acceptTemporal(id: string) {
  const { state, dispatch } = useGame.getState();
  const t = state.temporals.get(id);
  if (t?.status !== "pending" || isAccepted(t)) return;
  const freed = [...state.quests.values()].filter((q) => q.reserved && q.temporalId === id).length;
  const e = await dispatch({ type: "temporal_accepted", temporalId: id });
  offerUndo(e, () =>
    freed
      ? i18n.t("temporal.toast.acceptedQuests", { title: t.title, count: freed })
      : i18n.t("temporal.toast.accepted", { title: t.title }),
  );
}

/** Aplaza un encargo aceptado: vuelve a «sin aceptar» y sus quests, a la reserva. */
export async function postponeTemporal(id: string) {
  const { state, dispatch, say } = useGame.getState();
  const t = state.temporals.get(id);
  if (t?.status !== "pending" || !isAccepted(t)) return;
  // Con quests en curso no: primero se abandonan o se terminan (la proyección las dejaría en curso).
  const busy = t.questIds.map((q) => state.quests.get(q)).find((q) => q?.status === "active");
  if (busy) {
    sfx.cancel();
    say(() => i18n.t("temporal.toast.postponeBusy", { title: busy.title }));
    return;
  }
  sfx.cancel();
  const e = await dispatch({ type: "temporal_postponed", temporalId: id });
  offerUndo(e, () => i18n.t("temporal.toast.postponed", { title: t.title }));
}

/** Cumple el encargo: copia la recompensa en el evento y lanza la animación de «logro». */
export async function completeTemporal(id: string) {
  const { state, dispatch, say } = useGame.getState();
  const t = state.temporals.get(id);
  if (t?.status !== "pending") return;
  // Sin aceptar no se puede cumplir (la proyección también lo impide).
  if (!isAccepted(t)) {
    sfx.cancel();
    say(() => i18n.t("temporal.toast.acceptFirst", { title: t.title }));
    return;
  }
  // Con quests enlazadas sin terminar, el encargo no se puede cumplir (la proyección también lo impide).
  const missing = pendingLinks(t, state.quests);
  if (missing.length) {
    sfx.cancel();
    say(() => i18n.t("temporal.toast.questsPending", { count: missing.length, title: missing[0].title }));
    return;
  }
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
  const { state, dispatch } = useGame.getState();
  const t = state.temporals.get(id);
  if (!t) return;
  sfx.paperRip(1);
  const ui = useTemporalUi.getState();
  ui.closeView();
  if (ui.selectedId === id) ui.select(undefined);
  const e = await dispatch({ type: "temporal_deleted", temporalId: id });
  // Los archivos se borran pasada la ventana de deshacer (features/undo): si se deshace, siguen en uso.
  const blobIds = t.attachments.map((a) => a.blobId);
  if (blobIds.length) setTimeout(() => void collect(blobIds), UNDO_WINDOW_MS);
  offerUndo(e, () => i18n.t("temporal.toast.deleted", { title: t.title }));
}

/** Lee el contenido de un adjunto. `undefined` si este equipo no tiene el archivo. */
export async function loadAttachment(a: AttachmentRef): Promise<Blob | undefined> {
  return (await openBlobStore()).get(a.blobId);
}

/** Lleva al Quest Board con la quest elegida (desde un cartel o el formulario). */
export function goToQuest(questId: string) {
  const g = useGame.getState();
  const q = g.state.quests.get(questId);
  if (!q) return;
  // En reserva no está en el Quest Board: aparecerá al aceptar su encargo.
  if (q.reserved) {
    sfx.cancel();
    const owner = q.temporalId ? g.state.temporals.get(q.temporalId) : undefined;
    g.say(() => i18n.t("temporal.toast.reserved", { title: q.title, temporal: owner?.title ?? "" }));
    return;
  }
  sfx.page();
  useTemporalUi.getState().closeView();
  // Pestaña y plazo a «todo»: si no, la quest podría quedar fuera del tablón filtrado.
  useHorizonUi.getState().setFilter("board", "all");
  g.setTab("all");
  g.setSection("board");
  g.select(questId);
}

/** Lleva al tablón de encargos y abre el cartel (desde el detalle de una quest). */
export function goToTemporal(temporalId: string) {
  const g = useGame.getState();
  if (!g.state.temporals.has(temporalId)) return;
  sfx.page();
  useHorizonUi.getState().setFilter("temporal", "all");
  useTemporalUi.getState().setAccept("all");
  g.setSection("temporal");
  useTemporalUi.getState().open(temporalId);
}

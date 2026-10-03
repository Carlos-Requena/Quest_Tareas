// Modelo puro de los encargos temporales: sin React, sin store, sin Tauri, sin DOM.
// El dominio (src/domain) importa SOLO model.ts y events.ts, nunca index.ts.
//
// Un «encargo temporal» es algo que ocurre en una fecha: una cita con el médico,
// una entrega, un examen, un cumpleaños… Se clava en su propio tablón como un
// cartel de pergamino, con calaveras rojas según su dificultad.

import type { QuestState } from "../../domain/types";
import type { TemporalEventBody } from "./events";
import { cleanContacts, type ContactRef } from "../contacts/model";

// ───────────── Tipos de cartel ─────────────

/** Cada tipo tiene su cabecera decorativa (en inglés, como el resto de etiquetas) y su color. */
export const TEMPORAL_KINDS = ["summons", "delivery", "hunt", "scout", "gathering"] as const;
export type TemporalKind = (typeof TEMPORAL_KINDS)[number];

/** El nombre traducido de cada tipo está en el diccionario (`temporal.kinds.*`). */
export const KIND_META: Record<TemporalKind, { tag: string; red: boolean }> = {
  summons: { tag: "Summons", red: true },
  delivery: { tag: "Delivery", red: false },
  hunt: { tag: "Kill Quest", red: true },
  scout: { tag: "Scout Quest", red: true },
  gathering: { tag: "Gathering", red: false },
};

// ───────────── Dificultad y recompensa ─────────────

export const MIN_SKULLS = 1;
export const MAX_SKULLS = 5;

export const clampSkulls = (n: number) => Math.max(MIN_SKULLS, Math.min(MAX_SKULLS, Math.round(Number(n) || MIN_SKULLS)));

export interface TemporalReward {
  xp: number;
  gold: number;
}

/** Base de la recompensa por número de calaveras (1 … 5); el bono de las quests enlazadas, en features/rewards. */
export const REWARD_BY_SKULLS: TemporalReward[] = [
  { xp: 60, gold: 30 },
  { xp: 120, gold: 60 },
  { xp: 200, gold: 100 },
  { xp: 320, gold: 160 },
  { xp: 500, gold: 250 },
];

export const suggestedReward = (skulls: number): TemporalReward => ({ ...REWARD_BY_SKULLS[clampSkulls(skulls) - 1] });

// ───────────── Adjuntos ─────────────

/**
 * Referencia a un archivo adjunto. El contenido NO viaja en el evento: vive en el
 * almacén de binarios (src/storage/blobStore.ts) con su SHA-256 como clave.
 * En el evento solo van los metadatos y, para las imágenes, una miniatura pequeña.
 */
export interface AttachmentRef {
  id: string;
  /** SHA-256 del contenido: clave en el almacén de binarios, igual en todos los dispositivos. */
  blobId: string;
  name: string;
  /** image/* o application/pdf. */
  mime: string;
  /** Bytes del archivo guardado. */
  size: number;
  /** Miniatura de las imágenes (data URL de ~320 px). Los PDF no la tienen. */
  thumb?: string;
  addedAt: number;
}

export const isPdf = (a: Pick<AttachmentRef, "mime">) => a.mime === "application/pdf";
export const isImage = (a: Pick<AttachmentRef, "mime">) => a.mime.startsWith("image/");

// ───────────── Encargo ─────────────

/** Definición de un encargo temporal (lo que se clava en el tablón). */
export interface TemporalDef {
  id: string;
  title: string;
  kind: TemporalKind;
  /** Calaveras rojas: de 1 a 5. */
  difficulty: number;
  /** Cuándo ocurre (ms). Si es de todo el día, la medianoche local de ese día. */
  dueAt: number;
  allDay: boolean;
  place: string;
  notes: string;
  reward: TemporalReward;
  attachments: AttachmentRef[];
  /**
   * Quests enlazadas, en orden: hay que terminarlas todas para cumplir el encargo.
   * Falta en los datos anteriores (se lee como []).
   */
  questIds: string[];
  /** A quién llamar o escribir, o dónde ir (features/contacts). Falta en los anteriores (se lee como []). */
  contacts: ContactRef[];
  createdAt: number;
  /**
   * Se clava sin aceptar: sus quests quedan en reserva (fuera del Quest Board) hasta
   * aceptarlo con `temporal_accepted`. Solo cuenta en `temporal_created`. Falta en los
   * encargos anteriores, que nacen aceptados (sus quests ya estaban en el tablón).
   */
  planned?: boolean;
}

/** Campos editables con `temporal_updated`. Los adjuntos, las quests y la aceptación van con sus propios eventos. */
export type TemporalPatch = Partial<Omit<TemporalDef, "id" | "createdAt" | "attachments" | "questIds" | "planned">>;

export const TEMPORAL_LIMITS = { title: 80, place: 60, notes: 600, attachments: 8, fileMb: 20, quests: 12 } as const;

export type TemporalStatus = "pending" | "done";

export interface TemporalState extends Omit<TemporalDef, "planned"> {
  status: TemporalStatus;
  /**
   * Cuándo se aceptó (ts del evento). Sin él, el encargo está «sin aceptar»: sus quests
   * siguen en reserva y no se puede cumplir. Los anteriores a esta versión, al crearse.
   */
  acceptedAt?: number;
  /** Cuándo se cumplió (ts del evento). */
  completedAt?: number;
  /** Recompensa ganada: copia del evento, no cambia si se edita después. */
  earned?: TemporalReward;
  /** Cuándo se enlazó cada quest (ts del evento): una repetible cuenta si se completa después. */
  linkedAt: Record<string, number>;
}

// ───────────── Tiempo ─────────────
// El dominio no llama a Date.now(): `now` entra como parámetro. `new Date(ms)` solo
// se usa para saber dónde empieza el día en la zona horaria local.

const DAY = 86_400_000;

/** Medianoche local del día de `ms`. */
export function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Días naturales entre hoy y el día del encargo: 0 hoy, 1 mañana, −1 ayer. */
export const daysUntil = (dueAt: number, now: number) => Math.round((startOfDay(dueAt) - startOfDay(now)) / DAY);

/**
 * Urgencia de un encargo en `now`:
 * - overdue: ya pasó (los de todo el día, al acabar su día).
 * - today: es hoy y aún no ha pasado.
 * - soon: en los próximos 3 días.
 * - later: más adelante.
 * - done: cumplido.
 */
export type Urgency = "overdue" | "today" | "soon" | "later" | "done";

export const SOON_DAYS = 3;

export function urgencyOf(t: Pick<TemporalState, "status" | "dueAt" | "allDay">, now: number): Urgency {
  if (t.status === "done") return "done";
  const days = daysUntil(t.dueAt, now);
  const past = t.allDay ? days < 0 : now >= t.dueAt;
  if (past) return "overdue";
  if (days === 0) return "today";
  if (days <= SOON_DAYS) return "soon";
  return "later";
}

/** Aceptado: sus quests están en el Quest Board y se puede cumplir. */
export const isAccepted = (t: Pick<TemporalState, "acceptedAt">) => t.acceptedAt !== undefined;

/**
 * Orden del tablón: los pendientes aceptados primero y después los que aún no se han
 * aceptado, cada grupo por fecha (los vencidos primero); si se muestran, los cumplidos
 * del más reciente al más antiguo.
 */
export function sortTemporals(list: Iterable<TemporalState>): TemporalState[] {
  return [...list].sort((a, b) => {
    if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
    if (a.status === "done") return (b.completedAt ?? 0) - (a.completedAt ?? 0);
    if (isAccepted(a) !== isAccepted(b)) return isAccepted(a) ? -1 : 1;
    return a.dueAt - b.dueAt || a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1);
  });
}

// ───────────── Aceptados y sin aceptar ─────────────

/** Filtro del tablón por aceptación (se combina con el de plazos). */
export const ACCEPT_FILTERS = ["all", "accepted", "planned"] as const;
export type AcceptFilter = (typeof ACCEPT_FILTERS)[number];

/** ¿Entra el encargo pendiente en el filtro? */
export const matchesAccept = (f: AcceptFilter, t: Pick<TemporalState, "acceptedAt">) =>
  f === "all" || (f === "accepted") === isAccepted(t);

/** Cuántos pendientes hay en cada opción del filtro. */
export function countAccept(list: Iterable<Pick<TemporalState, "acceptedAt">>): Record<AcceptFilter, number> {
  const n = { all: 0, accepted: 0, planned: 0 };
  for (const t of list) {
    n.all++;
    n[isAccepted(t) ? "accepted" : "planned"]++;
  }
  return n;
}

/** Encargos que piden atención (hoy o vencidos): el aviso de la cabecera. */
export function needsAttention(list: Iterable<TemporalState>, now: number): number {
  let n = 0;
  for (const t of list) {
    const u = urgencyOf(t, now);
    if (u === "today" || u === "overdue") n++;
  }
  return n;
}

/** Encargos con hora que empiezan dentro de `windowMs`: los que merecen un aviso. */
export function remindersDue(list: Iterable<TemporalState>, now: number, windowMs: number): TemporalState[] {
  return [...list].filter((t) => t.status === "pending" && !t.allDay && t.dueAt > now && t.dueAt - now <= windowMs);
}

// ───────────── Quests enlazadas ─────────────

/**
 * Una quest enlazada está terminada si se completó del todo (`done`) o, si es de las
 * que vuelven, si se ha completado después de enlazarla: una vuelta anterior no cuenta.
 */
export const linkedQuestDone = (q: Pick<QuestState, "status" | "lastCompletedAt">, since: number): boolean =>
  q.status === "done" || (q.lastCompletedAt ?? -Infinity) >= since;

/** Quests enlazadas que siguen en el tablón de quests (las retiradas ya no cuentan), en su orden. */
export function linkedQuests(t: Pick<TemporalState, "questIds">, quests: Pick<Map<string, QuestState>, "get">): QuestState[] {
  return t.questIds.map((id) => quests.get(id)).filter((q): q is QuestState => !!q);
}

/** Quests enlazadas que faltan por terminar: mientras haya alguna, el encargo no se puede cumplir. */
export function pendingLinks(t: Pick<TemporalState, "questIds" | "linkedAt">, quests: Pick<Map<string, QuestState>, "get">): QuestState[] {
  return linkedQuests(t, quests).filter((q) => !linkedQuestDone(q, t.linkedAt[q.id] ?? 0));
}

/** Quests que se pueden enlazar a un encargo: sin terminar y sin otro encargo pendiente. */
export function linkCandidates(quests: Iterable<QuestState>, temporalId?: string): QuestState[] {
  return [...quests].filter((q) => q.status !== "done" && (!q.temporalId || q.temporalId === temporalId)).sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * La quest está en reserva: pertenece a un encargo pendiente que aún no se ha aceptado.
 * No sale en el Quest Board y `quest_accepted` se ignora hasta aceptar el encargo.
 */
export const inReserve = (acc: Pick<TemporalAcc, "board">, questId: string): boolean =>
  [...acc.board.values()].some((t) => t.status === "pending" && !isAccepted(t) && t.questIds.includes(questId));

/** Encargo pendiente al que pertenece cada quest (índice inverso de los enlaces). */
export function questOwners(board: Iterable<TemporalState>): Map<string, string> {
  const owners = new Map<string, string>();
  for (const t of board) if (t.status === "pending") for (const id of t.questIds) owners.set(id, t.id);
  return owners;
}

// ───────────── Proyección ─────────────

/** Acumulador que usa project() mientras reproduce los eventos. */
export interface TemporalAcc {
  board: Map<string, TemporalState>;
  /** Ids retirados: un `temporal_created` repetido no los resucita. */
  deleted: Set<string>;
}

export const newTemporalAcc = (): TemporalAcc => ({ board: new Map(), deleted: new Set() });

/** Datos tolerantes: lo que venga mal formado se corrige al leer, sin reescribir el evento. */
function normalize<T extends Omit<TemporalDef, "planned">>(def: T): T {
  const kind = TEMPORAL_KINDS.includes(def.kind) ? def.kind : "summons";
  return {
    ...def,
    kind,
    difficulty: clampSkulls(def.difficulty),
    allDay: !!def.allDay,
    place: def.place ?? "",
    notes: def.notes ?? "",
    reward: { xp: Math.max(0, def.reward?.xp ?? 0), gold: Math.max(0, def.reward?.gold ?? 0) },
    attachments: Array.isArray(def.attachments) ? def.attachments : [],
    // Los encargos anteriores a los contactos no los traen.
    contacts: cleanContacts(def.contacts),
    // Los encargos anteriores a las quests enlazadas no traen `questIds`.
    questIds: Array.isArray(def.questIds) ? [...new Set(def.questIds.filter((id) => typeof id === "string" && id))].slice(0, TEMPORAL_LIMITS.quests) : [],
  };
}

/** Otro encargo pendiente ya tiene esta quest: una quest pertenece a un solo encargo. */
const ownedElsewhere = (acc: TemporalAcc, questId: string, temporalId: string) =>
  [...acc.board.values()].some((o) => o.id !== temporalId && o.status === "pending" && o.questIds.includes(questId));

/** ¿Está terminada la quest `questId` (enlazada desde `since`)? Una quest que ya no existe no bloquea. */
export type LinkDone = (questId: string, since: number) => boolean;

/**
 * Aplica un evento de encargo temporal. Cada caso tiene su guarda, como project():
 * los eventos imposibles (cumplir dos veces, editar uno retirado, cumplir con quests
 * enlazadas sin terminar…) se ignoran. `linkDone` lo pone project(), que conoce las quests.
 * Devuelve la recompensa si el evento la concede (solo `temporal_completed`).
 */
export function applyTemporalEvent(acc: TemporalAcc, e: TemporalEventBody, ts: number, linkDone: LinkDone = () => true): TemporalReward | undefined {
  switch (e.type) {
    case "temporal_created": {
      const id = e.temporal.id;
      if (acc.board.has(id) || acc.deleted.has(id)) return;
      // Sin `planned` (todos los anteriores), nace aceptado.
      const { planned, ...def } = normalize(e.temporal);
      const questIds = def.questIds.filter((q) => !ownedElsewhere(acc, q, id));
      acc.board.set(id, {
        ...def,
        questIds,
        status: "pending",
        ...(planned === true ? {} : { acceptedAt: ts }),
        linkedAt: Object.fromEntries(questIds.map((q) => [q, ts])),
      });
      return;
    }
    case "temporal_accepted": {
      const t = acc.board.get(e.temporalId);
      // Solo un pendiente sin aceptar: si dos dispositivos lo aceptan, cuenta el primero.
      if (t?.status !== "pending" || isAccepted(t)) return;
      acc.board.set(t.id, { ...t, acceptedAt: ts });
      return;
    }
    case "temporal_postponed": {
      const t = acc.board.get(e.temporalId);
      // Aplazar devuelve sus quests a la reserva (las que estén en curso siguen en curso).
      if (t?.status !== "pending" || !isAccepted(t)) return;
      const { acceptedAt: _was, ...rest } = t;
      acc.board.set(t.id, rest);
      return;
    }
    case "temporal_updated": {
      const t = acc.board.get(e.temporalId);
      // Lo cumplido ya no se edita: su recompensa y su fecha son historia.
      if (t?.status !== "pending") return;
      // Solo los campos editables: la identidad, los adjuntos, las quests y el estado no se tocan con un parche.
      const patch: Partial<TemporalState> = { ...e.patch };
      for (const k of ["id", "createdAt", "attachments", "questIds", "linkedAt", "status", "acceptedAt", "completedAt", "earned"] as const) delete patch[k];
      delete (patch as { planned?: boolean }).planned;
      acc.board.set(t.id, { ...t, ...normalize({ ...t, ...patch }), status: t.status });
      return;
    }
    case "temporal_attached": {
      const t = acc.board.get(e.temporalId);
      if (!t || t.attachments.some((a) => a.id === e.attachment.id)) return;
      acc.board.set(t.id, { ...t, attachments: [...t.attachments, e.attachment] });
      return;
    }
    case "temporal_detached": {
      const t = acc.board.get(e.temporalId);
      if (!t) return;
      acc.board.set(t.id, { ...t, attachments: t.attachments.filter((a) => a.id !== e.attachmentId) });
      return;
    }
    case "temporal_linked": {
      const t = acc.board.get(e.temporalId);
      // Solo en pendientes, sin repetir, sin pasar del límite y si ningún otro encargo pendiente la tiene.
      if (t?.status !== "pending" || t.questIds.includes(e.questId) || t.questIds.length >= TEMPORAL_LIMITS.quests) return;
      if (ownedElsewhere(acc, e.questId, t.id)) return;
      acc.board.set(t.id, { ...t, questIds: [...t.questIds, e.questId], linkedAt: { ...t.linkedAt, [e.questId]: ts } });
      return;
    }
    case "temporal_unlinked": {
      const t = acc.board.get(e.temporalId);
      if (t?.status !== "pending" || !t.questIds.includes(e.questId)) return;
      const { [e.questId]: _gone, ...linkedAt } = t.linkedAt;
      acc.board.set(t.id, { ...t, questIds: t.questIds.filter((q) => q !== e.questId), linkedAt });
      return;
    }
    case "temporal_completed": {
      const t = acc.board.get(e.temporalId);
      // Si dos dispositivos lo cumplen sin conexión, solo cuenta el primero.
      if (t?.status !== "pending") return;
      // Sin aceptar no se puede cumplir (sus quests ni siquiera están en el Quest Board).
      if (!isAccepted(t)) return;
      // Con quests enlazadas sin terminar no se puede cumplir.
      if (t.questIds.some((q) => !linkDone(q, t.linkedAt[q] ?? 0))) return;
      const earned = { xp: Math.max(0, e.reward.xp), gold: Math.max(0, e.reward.gold) };
      acc.board.set(t.id, { ...t, status: "done", completedAt: ts, earned });
      return earned;
    }
    case "temporal_deleted":
      if (acc.board.delete(e.temporalId)) acc.deleted.add(e.temporalId);
      return;
  }
}

/** Ids de los binarios que siguen en uso: los demás se pueden borrar del almacén. */
export function liveBlobIds(board: Iterable<TemporalState>): Set<string> {
  const ids = new Set<string>();
  for (const t of board) for (const a of t.attachments) ids.add(a.blobId);
  return ids;
}

export const clampText = (s: string, max: number) => s.trim().slice(0, max);

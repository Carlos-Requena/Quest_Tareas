// Modelo puro de la búsqueda: sin React, sin store, sin Tauri, sin DOM. Sin eventos.
//
// Busca en todo lo que escribe el usuario: quests (también las terminadas y las fallidas),
// encargos, bloques de la agenda y objetos del almanaque. Sin distinguir mayúsculas ni
// tildes, y con hiragana y katakana como iguales. Cada palabra de la búsqueda tiene que
// estar en algún campo; pesa más el título.

import type { QuestState } from "../../domain/types";
import type { TemporalState } from "../temporal/model";
import type { AgendaState } from "../agenda/model";
import type { ItemDef } from "../items/model";
import { isChecklistCondition } from "../checklist/model";

export type SearchKind = "quest" | "temporal" | "agenda" | "item";

export interface SearchHit {
  kind: SearchKind;
  id: string;
  title: string;
  /** Dónde más aparece (un trozo del campo que coincide), si no es el título. */
  snippet?: string;
  /** Estado, para pintarlo: en curso, terminada, fallida, cumplido, quemado… */
  status: "open" | "active" | "done" | "failed" | "reserved";
  score: number;
}

export interface SearchSources {
  quests: Iterable<QuestState>;
  temporals: Iterable<TemporalState>;
  agenda: Iterable<AgendaState>;
  items: Iterable<ItemDef>;
}

/** Como mucho tantos resultados. */
export const SEARCH_LIMIT = 40;

/** Forma comparable: minúsculas, sin tildes, ancho normal y katakana → hiragana. */
export function fold(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

/** Palabras de la búsqueda (sin vacías). */
export const terms = (query: string) => fold(query).split(/\s+/).filter(Boolean);

interface Doc {
  kind: SearchKind;
  id: string;
  title: string;
  status: SearchHit["status"];
  /** Campos además del título. */
  fields: string[];
  /** Desempate: lo más reciente primero. */
  recency: number;
}

/** Puntos de un documento, o 0 si alguna palabra no está. */
function scoreDoc(d: Doc, words: string[]): { score: number; snippet?: string } {
  const title = fold(d.title);
  const folded = d.fields.map(fold);
  let score = 0;
  let snippet: string | undefined;
  for (const w of words) {
    if (title.startsWith(w)) score += 6;
    else if (title.split(/\s+/).some((t) => t.startsWith(w))) score += 4;
    else if (title.includes(w)) score += 3;
    else {
      const i = folded.findIndex((f) => f.includes(w));
      if (i < 0) return { score: 0 };
      score += 1;
      snippet ??= excerpt(d.fields[i], folded[i].indexOf(w));
    }
  }
  // Lo que está por hacer, antes que lo terminado.
  if (d.status === "open" || d.status === "active") score += 0.5;
  return { score, snippet };
}

/** Un trozo corto alrededor de la coincidencia. */
function excerpt(text: string, at: number): string {
  const flat = text.replace(/\s+/g, " ");
  const start = Math.max(0, at - 24);
  const out = flat.slice(start, start + 70).trim();
  return (start > 0 ? "…" : "") + out + (start + 70 < flat.length ? "…" : "");
}

function docs(src: SearchSources): Doc[] {
  const out: Doc[] = [];
  for (const q of src.quests) {
    const conds = q.conditions.flatMap((c) => [c.label, ...(isChecklistCondition(c) ? c.items.map((it) => it.text) : [])]);
    out.push({
      kind: "quest",
      id: q.id,
      title: q.title,
      status: q.failedAt !== undefined ? "failed" : q.status === "done" ? "done" : q.status === "active" ? "active" : q.reserved ? "reserved" : "open",
      fields: [q.description, q.client, q.area, q.kind, ...conds, ...(q.contacts ?? []).flatMap((c) => [c.name, c.value])].filter(Boolean),
      recency: q.lastCompletedAt ?? q.createdAt,
    });
  }
  for (const t of src.temporals) {
    out.push({
      kind: "temporal",
      id: t.id,
      title: t.title,
      status: t.failedAt !== undefined ? "failed" : t.status === "done" ? "done" : t.acceptedAt === undefined ? "reserved" : "open",
      fields: [t.place, t.notes, ...t.attachments.map((a) => a.name), ...t.contacts.flatMap((c) => [c.name, c.value])].filter(Boolean),
      recency: t.dueAt,
    });
  }
  for (const a of src.agenda) out.push({ kind: "agenda", id: a.id, title: a.title, status: "open", fields: [a.notes].filter(Boolean), recency: a.createdAt });
  for (const it of src.items) out.push({ kind: "item", id: it.id, title: it.name, status: "open", fields: [it.description].filter(Boolean), recency: it.createdAt });
  return out;
}

/** Resultados de una búsqueda, de más a menos relevantes. Vacía si la búsqueda está vacía. */
export function search(src: SearchSources, query: string, limit = SEARCH_LIMIT): SearchHit[] {
  const words = terms(query);
  if (!words.length) return [];
  const hits: (SearchHit & { recency: number })[] = [];
  for (const d of docs(src)) {
    const { score, snippet } = scoreDoc(d, words);
    if (score > 0) hits.push({ kind: d.kind, id: d.id, title: d.title, status: d.status, score, recency: d.recency, ...(snippet ? { snippet } : {}) });
  }
  hits.sort((a, b) => b.score - a.score || b.recency - a.recency);
  return hits.slice(0, limit).map(({ recency: _r, ...h }) => h);
}

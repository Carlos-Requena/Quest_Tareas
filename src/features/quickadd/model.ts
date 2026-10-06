// Modelo puro del alta rápida: sin React, sin store, sin Tauri, sin DOM.
//
// Una línea de texto se convierte en una quest. Lo que no es una marca es el título:
//
//   «Llamar al banco mañana #Hogar @Banco !»  →  título «Llamar al banco», fecha límite
//   mañana, área Hogar, encargado por Banco, de élite.
//
// Marcas (separadas por espacios, también el espacio japonés «　»):
//   hoy · mañana · pasado mañana · lunes … domingo · 12/10 · 12/10/2026
//   今日 · 明日 · 明後日 · 月曜(日) … 日曜(日)
//   #área   @cliente   !  (élite)   x3 / ×3  (objetivo de 3)
//
// El día de la semana es el próximo, sin contar hoy (para hoy está «hoy»).

import type { Category } from "../../domain/types";

export interface QuickQuest {
  title: string;
  /** Medianoche local del día de la fecha límite. */
  dueAt?: number;
  area?: string;
  client?: string;
  category: Category;
  /** Cuántas veces (el objetivo de contador). */
  target: number;
  /** Marcas reconocidas, en orden (para enseñarlas mientras se escribe). */
  tokens: QuickToken[];
}

export type QuickToken =
  | { kind: "date"; dueAt: number }
  | { kind: "area"; value: string }
  | { kind: "client"; value: string }
  | { kind: "elite" }
  | { kind: "target"; value: number };

/** Lo más que se puede pedir con «x3». */
export const QUICK_MAX_TARGET = 99;

const strip = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Días de la semana (0 = domingo … 6 = sábado), en español sin tildes y en japonés. */
const WEEKDAYS: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  日曜: 0,
  月曜: 1,
  火曜: 2,
  水曜: 3,
  木曜: 4,
  金曜: 5,
  土曜: 6,
};

/** Días a partir de hoy de las palabras de fecha. */
const RELATIVE: Record<string, number> = { hoy: 0, manana: 1, 今日: 0, 明日: 1, 明後日: 2 };

/** Medianoche local del día que cae `days` días después del de `now`. */
function dayFrom(now: number, days: number): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days).getTime();
}

/** «12/10» o «12/10/2026» (día/mes). Sin año: el próximo 12 de octubre (hoy incluido). */
function parseDayMonth(token: string, now: number): number | undefined {
  const m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?$/.exec(token);
  if (!m) return;
  const day = +m[1];
  const month = +m[2] - 1;
  const today = dayFrom(now, 0);
  let year = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : new Date(now).getFullYear();
  let d = new Date(year, month, day);
  if (d.getMonth() !== month || d.getDate() !== day) return; // 31/2 no existe
  if (!m[3] && d.getTime() < today) {
    year++;
    d = new Date(year, month, day);
    if (d.getMonth() !== month) return;
  }
  return d.getTime();
}

/** Una palabra de fecha (sin «pasado mañana», que son dos). */
function parseDate(word: string, now: number): number | undefined {
  const w = strip(word);
  if (w in RELATIVE) return dayFrom(now, RELATIVE[w]);
  const wd = WEEKDAYS[w] ?? WEEKDAYS[word.replace(/日$/, "")];
  if (wd !== undefined) {
    const today = new Date(now).getDay();
    return dayFrom(now, ((wd - today + 7) % 7) || 7);
  }
  return parseDayMonth(word, now);
}

/** Convierte la línea en una quest. `now` decide qué es «mañana». */
export function parseQuick(text: string, now: number): QuickQuest {
  const words = text.split(/[\s　]+/).filter(Boolean);
  const title: string[] = [];
  const tokens: QuickToken[] = [];
  const out: QuickQuest = { title: "", category: "request", target: 1, tokens };

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const s = strip(w);
    // «pasado mañana»: dos palabras.
    if (s === "pasado" && strip(words[i + 1] ?? "") === "manana") {
      out.dueAt = dayFrom(now, 2);
      tokens.push({ kind: "date", dueAt: out.dueAt });
      i++;
      continue;
    }
    const date = parseDate(w, now);
    if (date !== undefined) {
      out.dueAt = date;
      tokens.push({ kind: "date", dueAt: date });
      continue;
    }
    const tag = /^[#＃](.+)$/.exec(w);
    if (tag) {
      out.area = tag[1].replace(/_/g, " ");
      tokens.push({ kind: "area", value: out.area });
      continue;
    }
    const at = /^[@＠](.+)$/.exec(w);
    if (at) {
      out.client = at[1].replace(/_/g, " ");
      tokens.push({ kind: "client", value: out.client });
      continue;
    }
    if (/^[!！]+$/.test(w)) {
      out.category = "elite";
      tokens.push({ kind: "elite" });
      continue;
    }
    const times = /^[x×]\s*(\d{1,3})$/i.exec(w);
    if (times && +times[1] >= 1) {
      out.target = Math.min(QUICK_MAX_TARGET, +times[1]);
      tokens.push({ kind: "target", value: out.target });
      continue;
    }
    // «Llamar al banco!»: la exclamación pegada también la hace de élite (y se queda en el título).
    if (/[!！]$/.test(w) && w.length > 1) {
      out.category = "elite";
      if (!tokens.some((t) => t.kind === "elite")) tokens.push({ kind: "elite" });
    }
    title.push(w);
  }
  out.title = title.join(" ").trim();
  return out;
}

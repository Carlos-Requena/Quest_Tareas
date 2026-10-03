// Modelo puro de la agenda: sin React, sin store, sin Tauri, sin DOM.
// El dominio (src/domain) importa SOLO model.ts y events.ts, nunca index.ts.
//
// La agenda es el calendario personal por horas: bloques con hora de inicio y de fin
// («Gimnasio, 19:00–20:30»), de un día o que se repiten ciertos días de la semana.
// No da XP ni oro: es para organizarse. Se sincroniza como el resto (eventos agenda_*).
//
// Los días van como texto AAAA-MM-DD en la hora local, no como milisegundos: un bloque
// de las 9:00 sigue a las 9:00 aunque cambie la hora (verano / invierno).

import type { AgendaEventBody } from "./events";

/** Color del bloque: los tokens de la app (oro, rojo, verde, violeta, cian). */
export const AGENDA_COLORS = ["gold", "elite", "request", "repeat", "stamp"] as const;
export type AgendaColor = (typeof AGENDA_COLORS)[number];

/** Repetición: los días de la semana (0 = domingo … 6 = sábado; los 7, cada día) y, si acaba, el último día. */
export interface AgendaRepeat {
  days: number[];
  /** Último día (AAAA-MM-DD), incluido. */
  until?: string;
}

/** Un bloque de la agenda (lo que se crea). */
export interface AgendaDef {
  id: string;
  title: string;
  /** Día de la primera vez (AAAA-MM-DD, hora local). */
  date: string;
  /** Minutos desde medianoche: inicio (0–1435) y fin (inicio + 5 … 1440). */
  start: number;
  end: number;
  notes: string;
  color: AgendaColor;
  /** Sin repetición, es de un solo día. */
  repeat?: AgendaRepeat;
  createdAt: number;
}

/** Campos editables con `agenda_updated` (la lista entera de días, si cambia la repetición). */
export type AgendaPatch = Partial<Omit<AgendaDef, "id" | "createdAt">>;

export interface AgendaState extends AgendaDef {
  /** Días quitados de un bloque que se repite («solo este día»), AAAA-MM-DD. */
  skipped: string[];
}

export const AGENDA_LIMITS = { title: 80, notes: 400, minMinutes: 5, skipped: 500 } as const;
export const DAY_MINUTES = 1440;

// ───────────── Días (AAAA-MM-DD, hora local) ─────────────
// El dominio no llama a Date.now(): `now` entra como parámetro. `new Date(...)` solo
// convierte entre la fecha local y los milisegundos.

const pad = (n: number) => String(n).padStart(2, "0");

/** Día local de `ms`: «2026-10-03». */
export function dateKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const parts = (key: string) => key.split("-").map(Number) as [number, number, number];

/** ¿Es un día válido AAAA-MM-DD? */
export function isDateKey(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = parts(s);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Medianoche local del día. */
export function keyMs(key: string): number {
  const [y, m, d] = parts(key);
  return new Date(y, m - 1, d).getTime();
}

/** El día `n` días después (o antes, si es negativo). */
export function addDays(key: string, n: number): string {
  const [y, m, d] = parts(key);
  return dateKey(new Date(y, m - 1, d + n).getTime());
}

/** Día de la semana: 0 = domingo … 6 = sábado. */
export function weekday(key: string): number {
  const [y, m, d] = parts(key);
  return new Date(y, m - 1, d).getDay();
}

/** Lunes de la semana del día (las semanas empiezan en lunes). */
export const weekStart = (key: string) => addDays(key, -((weekday(key) + 6) % 7));

/** Los 7 días de la semana que empieza en `monday`. */
export const weekDays = (monday: string) => Array.from({ length: 7 }, (_, i) => addDays(monday, i));

/** Ms del minuto `minutes` del día `key` (respeta el cambio de hora). */
export function atMinute(key: string, minutes: number): number {
  const [y, m, d] = parts(key);
  return new Date(y, m - 1, d, 0, minutes).getTime();
}

/** «19:05» a minutos; NaN si no vale. «24:00» vale (fin del día). */
export function parseClock(s: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return NaN;
  const v = +m[1] * 60 + +m[2];
  return +m[2] < 60 && v <= DAY_MINUTES ? v : NaN;
}

export const formatClock = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

// ───────────── Repetición ─────────────

/** ¿Hay un bloque ese día? */
export function occursOn(e: Pick<AgendaState, "date" | "repeat" | "skipped">, key: string): boolean {
  if (e.skipped.includes(key)) return false;
  if (!e.repeat) return e.date === key;
  if (key < e.date || (e.repeat.until && key > e.repeat.until)) return false;
  return e.repeat.days.includes(weekday(key));
}

/** Se repite todos los días. */
export const everyDay = (r?: AgendaRepeat) => !!r && r.days.length === 7;

/** Una vez del bloque en un día concreto. */
export interface AgendaOccurrence {
  entry: AgendaState;
  date: string;
  start: number;
  end: number;
}

/** Los bloques de un día, por hora de inicio. */
export function agendaOn(entries: Iterable<AgendaState>, key: string): AgendaOccurrence[] {
  const out: AgendaOccurrence[] = [];
  for (const e of entries) if (occursOn(e, key)) out.push({ entry: e, date: key, start: e.start, end: e.end });
  return out.sort((a, b) => a.start - b.start || a.end - b.end || (a.entry.id < b.entry.id ? -1 : 1));
}

// ───────────── Proyección ─────────────

export interface AgendaAcc {
  entries: Map<string, AgendaState>;
  /** Ids retirados: un `agenda_created` repetido no los resucita. */
  deleted: Set<string>;
}

export const newAgendaAcc = (): AgendaAcc => ({ entries: new Map(), deleted: new Set() });

/**
 * Datos tolerantes: corrige lo mal formado al leer, sin reescribir el evento. Sin título
 * o sin un día válido no hay bloque (undefined). Las horas se ajustan al día y a 5 minutos
 * de duración como mínimo; los días de la repetición, sin repetir y en orden.
 */
export function normalizeAgenda<T extends AgendaDef>(def: T): T | undefined {
  const title = typeof def.title === "string" ? def.title.trim().slice(0, AGENDA_LIMITS.title) : "";
  if (!title || !isDateKey(def.date)) return undefined;
  const raw = Math.round(Number(def.start));
  const start = Math.max(0, Math.min(DAY_MINUTES - AGENDA_LIMITS.minMinutes, Number.isFinite(raw) ? raw : 0));
  const rawEnd = Math.round(Number(def.end));
  const end = Math.max(start + AGENDA_LIMITS.minMinutes, Math.min(DAY_MINUTES, Number.isFinite(rawEnd) ? rawEnd : start + 60));
  const days = Array.isArray(def.repeat?.days) ? [...new Set(def.repeat.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b) : [];
  const until = def.repeat?.until;
  return {
    ...def,
    title,
    start,
    end,
    notes: typeof def.notes === "string" ? def.notes.trim().slice(0, AGENDA_LIMITS.notes) : "",
    color: AGENDA_COLORS.includes(def.color) ? def.color : "gold",
    repeat: days.length ? { days, ...(isDateKey(until) && until >= def.date ? { until } : {}) } : undefined,
  };
}

/**
 * Aplica un evento de la agenda. Cada caso tiene su guarda, como project(): crear un id
 * que ya existe o se retiró, editar o quitar un día de uno que no existe, o quitar un día
 * de uno que no se repite, se ignora.
 */
export function applyAgendaEvent(acc: AgendaAcc, e: AgendaEventBody): void {
  switch (e.type) {
    case "agenda_created": {
      const id = e.entry.id;
      if (!id || acc.entries.has(id) || acc.deleted.has(id)) return;
      const def = normalizeAgenda(e.entry);
      if (def) acc.entries.set(id, { ...def, skipped: [] });
      return;
    }
    case "agenda_updated": {
      const cur = acc.entries.get(e.entryId);
      if (!cur) return;
      // La identidad y los días quitados no se tocan con un parche.
      const { id: _id, createdAt: _c, skipped: _s, ...patch } = e.patch as Partial<AgendaState>;
      const next = normalizeAgenda({ ...cur, ...patch });
      if (next) acc.entries.set(cur.id, next);
      return;
    }
    case "agenda_skipped": {
      const cur = acc.entries.get(e.entryId);
      // Solo un día en que de verdad hay bloque (y que se repite: uno suelto se retira).
      if (!cur?.repeat || !isDateKey(e.date) || !occursOn(cur, e.date) || cur.skipped.length >= AGENDA_LIMITS.skipped) return;
      acc.entries.set(cur.id, { ...cur, skipped: [...cur.skipped, e.date].sort() });
      return;
    }
    case "agenda_deleted":
      if (acc.entries.delete(e.entryId)) acc.deleted.add(e.entryId);
      return;
  }
}

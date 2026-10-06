// Modelo puro del calendario: sin React, sin store, sin Tauri, sin DOM.
// No tiene eventos: se calcula de las quests, los encargos y la agenda (features/agenda).
//
// La semana enseña lo que hay que hacer cada día: las quests con fecha límite, los
// encargos (aceptados y sin aceptar) y los bloques de la agenda. El día los pone en
// una rejilla por horas.

import type { Category, QuestState } from "../../domain/types";
import { isAccepted, type TemporalState } from "../temporal/model";
import { agendaOn, dateKey, weekday, type AgendaColor, type AgendaState } from "../agenda/model";

/** Lo que puede salir en un día del calendario. */
export type CalendarItem =
  | { kind: "agenda"; id: string; title: string; start: number; end: number; color: AgendaColor; repeats: boolean }
  /** `start` falta en los de todo el día. */
  | { kind: "temporal"; id: string; title: string; start?: number; end?: number; skulls: number; accepted: boolean; done: boolean; burned?: boolean }
  /**
   * Quest: por su fecha límite o, si se repite por días, cada día que toca (`repeats`).
   * `done`: ya hecha ese día; `failed`: se fracturó (features/failure).
   */
  | { kind: "quest"; id: string; title: string; category: Category; active: boolean; repeats?: boolean; done?: boolean; failed?: boolean };

export interface CalendarDay {
  date: string;
  /** Sin hora: quests con fecha límite y encargos de todo el día. */
  allDay: CalendarItem[];
  /** Con hora: bloques de la agenda y encargos con hora, por hora de inicio. */
  timed: (CalendarItem & { start: number; end: number })[];
}

/** Lo que dura un encargo con hora en la rejilla del día (no tiene fin). */
export const TEMPORAL_MINUTES = 60;

/** Minuto del día (0–1439) de `ms`, en la hora local. */
export function minuteOf(ms: number): number {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

export interface CalendarSources {
  quests: Iterable<QuestState>;
  temporals: Iterable<TemporalState>;
  agenda: Iterable<AgendaState>;
  /**
   * Hoy (AAAA-MM-DD): las quests que se repiten por días salen de hoy en adelante (el
   * pasado no se sabe). Sin él, salen todos los días que tocan.
   */
  today?: string;
}

const CATEGORY_ORDER: Record<Category, number> = { elite: 0, request: 1, repeat: 2 };

/**
 * Lo que hay un día. Las quests salen por su propia fecha límite (las de un encargo,
 * con su encargo); no salen las terminadas ni las que esperan en reserva. Los encargos
 * salen también cumplidos, para ver lo que pasó.
 */
export function calendarDay(date: string, src: CalendarSources): CalendarDay {
  const allDay: CalendarItem[] = [];
  const timed: CalendarDay["timed"] = [];

  for (const t of src.temporals) {
    if (dateKey(t.dueAt) !== date) continue;
    // Quemado (features/failure): terminado, pero sin cumplir.
    const base = { kind: "temporal" as const, id: t.id, title: t.title, skulls: t.difficulty, accepted: t.status === "done" || isAccepted(t), done: t.status === "done", ...(t.failedAt !== undefined ? { burned: true } : {}) };
    if (t.allDay) allDay.push(base);
    else {
      const start = minuteOf(t.dueAt);
      timed.push({ ...base, start, end: Math.min(1440, start + TEMPORAL_MINUTES) });
    }
  }
  const all = [...src.quests].sort((a, b) => CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category] || a.createdAt - b.createdAt);
  // Por su fecha límite: las pendientes y las que se fracturaron ese día (features/failure).
  for (const q of all) {
    if (q.dueAt === undefined || q.reserved || dateKey(q.dueAt) !== date) continue;
    if (q.status === "done" && q.failedAt === undefined) continue;
    allDay.push({ kind: "quest", id: q.id, title: q.title, category: q.category, active: q.status === "active", ...(q.failedAt !== undefined ? { failed: true } : {}) });
  }
  // Las que se repiten por días, cada día que tocan (features/complex), de hoy en adelante.
  const wd = weekday(date);
  if (!src.today || date >= src.today) {
    for (const q of all) {
      if (!q.repeatDays?.includes(wd) || q.reserved || q.status === "done") continue;
      const done = q.lastCompletedAt !== undefined && dateKey(q.lastCompletedAt) === date;
      allDay.push({ kind: "quest", id: q.id, title: q.title, category: q.category, active: q.status === "active", repeats: true, ...(done ? { done } : {}) });
    }
  }

  for (const o of agendaOn(src.agenda, date))
    timed.push({ kind: "agenda", id: o.entry.id, title: o.entry.title, start: o.start, end: o.end, color: o.entry.color, repeats: !!o.entry.repeat });

  // Encargos primero (lo que no se mueve) y luego las quests.
  allDay.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "temporal" ? -1 : 1));
  timed.sort((a, b) => a.start - b.start || a.end - b.end);
  return { date, allDay, timed };
}

/** Sitio de un bloque en la rejilla del día: columna y cuántas columnas tiene su grupo de solapados. */
export interface Slot {
  col: number;
  cols: number;
}

/**
 * Reparte los bloques que se solapan en columnas, como un calendario: cada grupo de
 * bloques que se pisan usa tantas columnas como bloques a la vez llega a tener.
 */
export function layoutDay(blocks: { key: string; start: number; end: number }[]): Map<string, Slot> {
  const out = new Map<string, Slot>();
  const sorted = [...blocks].sort((a, b) => a.start - b.start || b.end - a.end);
  let group: string[] = [];
  let groupEnd = -Infinity;
  let colEnds: number[] = [];
  const close = () => {
    for (const k of group) out.get(k)!.cols = colEnds.length;
    group = [];
    colEnds = [];
    groupEnd = -Infinity;
  };
  for (const b of sorted) {
    if (group.length && b.start >= groupEnd) close();
    let col = colEnds.findIndex((end) => end <= b.start);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(b.end);
    } else colEnds[col] = b.end;
    out.set(b.key, { col, cols: 1 });
    group.push(b.key);
    groupEnd = Math.max(groupEnd, b.end);
  }
  close();
  return out;
}

// Modelo puro de las quests complejas: sin React, sin store, sin Tauri, sin DOM.
// El dominio (src/domain) importa SOLO este archivo, nunca index.ts.
//
// Una quest «compleja» tiene reglas además de objetivos:
// - Repetición: tras completarla vuelve al tablón al cabo de un tiempo (en cualquier
//   categoría, no solo en las repetibles).
// - Requisitos: otras quests que hay que completar antes de poder aceptarla.

import type { QuestDef, QuestState } from "../../domain/types";

// ───────────── Repetición ─────────────

/** Vuelve al tablón tras completarla: las repetibles siempre; las demás, si tienen repetición (cada N o por días). */
export const recurs = (q: Pick<QuestDef, "category" | "cooldownMinutes" | "repeatDays">): boolean =>
  q.category === "repeat" || (q.cooldownMinutes ?? 0) > 0 || !!q.repeatDays?.length;

// ───────────── Repetición por días de la semana ─────────────
// «Gimnasio lunes, miércoles y viernes»: vuelve al tablón a medianoche del siguiente de
// esos días, como los bloques de la agenda (0 = domingo … 6 = sábado). Si la quest tiene
// días, mandan sobre la espera (`cooldownMinutes`).

/**
 * Datos tolerantes: días de 0 a 6, sin repetir y en orden. `undefined` si no hay
 * ninguno (así las quests que se repiten cada N siguen igual).
 */
export function cleanRepeatDays(days: unknown): number[] | undefined {
  if (!Array.isArray(days)) return undefined;
  const out = [...new Set(days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b);
  return out.length ? out : undefined;
}

/** Medianoche local del día que cae `n` días después del de `ms` (respeta el cambio de hora). */
function midnightAfter(ms: number, n: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime();
}

/** Cuántos días faltan, desde el día de `ms`, para el siguiente día de la lista (1 … 7). */
function daysToNext(ms: number, days: number[]): number {
  const today = new Date(ms).getDay();
  for (let i = 1; i <= 7; i++) if (days.includes((today + i) % 7)) return i;
  return 7;
}

/** Medianoche del siguiente día de la lista, contando desde mañana. */
export const nextRepeatDay = (ms: number, days: number[]): number => midnightAfter(ms, daysToNext(ms, days));

/** Cuándo vuelve al tablón si se completa en `ts`: el siguiente día que toca, o tras su espera. */
export function returnsAt(q: Pick<QuestDef, "cooldownMinutes" | "repeatDays">, ts: number): number {
  return q.repeatDays?.length ? nextRepeatDay(ts, q.repeatDays) : ts + (q.cooldownMinutes ?? 0) * 60_000;
}

/**
 * Hasta cuándo dura la racha si se completa en `ts`, en las que se repiten por días: hasta
 * que acaba el siguiente día que toca. `undefined` en las demás (features/streaks lo calcula).
 */
export function streakUntil(q: Pick<QuestDef, "repeatDays">, ts: number): number | undefined {
  return q.repeatDays?.length ? midnightAfter(ts, daysToNext(ts, q.repeatDays) + 1) : undefined;
}

/** ¿Toca ese día de la semana (0 = domingo … 6 = sábado)? */
export const repeatsOnWeekday = (q: Pick<QuestDef, "repeatDays">, weekday: number) => !!q.repeatDays?.includes(weekday);

export const RECURRENCE_UNITS = ["hours", "days", "weeks"] as const;
export type RecurrenceUnit = (typeof RECURRENCE_UNITS)[number];

export const UNIT_MINUTES: Record<RecurrenceUnit, number> = { hours: 60, days: 24 * 60, weeks: 7 * 24 * 60 };

/** Opciones rápidas del formulario. `daily` marca la de 20 h (diaria con margen). */
export const RECURRENCE_PRESETS: { minutes: number; unit: RecurrenceUnit; count: number; daily?: boolean }[] = [
  { minutes: 60, unit: "hours", count: 1 },
  { minutes: 4 * 60, unit: "hours", count: 4 },
  { minutes: 8 * 60, unit: "hours", count: 8 },
  { minutes: 20 * 60, unit: "hours", count: 20, daily: true },
  { minutes: 3 * 24 * 60, unit: "days", count: 3 },
  { minutes: 7 * 24 * 60, unit: "weeks", count: 1 },
];

/** Límites de la repetición personalizada: de 1 hora a 1 año. */
export const RECURRENCE_LIMITS = { minMinutes: 60, maxMinutes: 365 * 24 * 60 } as const;

/** «Cada N unidades» → minutos, dentro de los límites. */
export function recurrenceMinutes(count: number, unit: RecurrenceUnit): number {
  const n = Math.max(1, Math.round(Number(count) || 1));
  return Math.max(RECURRENCE_LIMITS.minMinutes, Math.min(RECURRENCE_LIMITS.maxMinutes, n * UNIT_MINUTES[unit]));
}

/** Minutos → la unidad más grande que los divide exacto (para enseñarlos como «3 días»). */
export function splitMinutes(minutes: number): { count: number; unit: RecurrenceUnit } {
  for (const unit of ["weeks", "days"] as const) {
    if (minutes >= UNIT_MINUTES[unit] && minutes % UNIT_MINUTES[unit] === 0) return { count: minutes / UNIT_MINUTES[unit], unit };
  }
  return { count: Math.max(1, Math.round(minutes / 60)), unit: "hours" };
}

// ───────────── Requisitos ─────────────

/** Como máximo, requisitos por quest. */
export const MAX_REQUIRES = 6;

/** Basta con `get` para consultar quests: vale un Map o un acumulador. */
export type QuestLookup = Pick<Map<string, QuestState>, "get">;

/**
 * Datos tolerantes: ids únicos, sin la propia quest y como mucho MAX_REQUIRES.
 * `undefined` si no tiene requisitos (así los datos antiguos quedan igual).
 */
export function cleanRequires(def: Pick<QuestDef, "id" | "requires">): string[] | undefined {
  if (!Array.isArray(def.requires)) return undefined;
  const ids = [...new Set(def.requires.filter((id) => typeof id === "string" && id && id !== def.id))].slice(0, MAX_REQUIRES);
  return ids.length ? ids : undefined;
}

/**
 * Un requisito está cumplido si esa quest se ha completado alguna vez. Si ya no
 * existe (se retiró del tablón), deja de bloquear: si no, la quest quedaría
 * bloqueada para siempre.
 */
export function requirementMet(id: string, quests: QuestLookup): boolean {
  const r = quests.get(id);
  // Fallida (features/failure): ya no se puede completar; tampoco bloquea para siempre.
  return !r || r.completions > 0 || r.failedAt !== undefined;
}

export const prerequisitesMet = (q: Pick<QuestDef, "requires">, quests: QuestLookup): boolean =>
  (q.requires ?? []).every((id) => requirementMet(id, quests));

/** Requisitos que aún bloquean la quest, en su orden. */
export function blockers(q: Pick<QuestDef, "requires">, quests: QuestLookup): QuestState[] {
  return (q.requires ?? []).map((id) => quests.get(id)).filter((r): r is QuestState => !!r && !requirementMet(r.id, quests));
}

/**
 * ¿Pedir `requireId` como requisito de `questId` cerraría un círculo? Pasa si `requireId`
 * ya depende (directa o indirectamente) de `questId`. Al crear no puede ocurrir; al editar
 * los requisitos de una quest que ya existe, sí (features/editing).
 */
export function wouldCycle(questId: string, requireId: string, quests: QuestLookup): boolean {
  const seen = new Set<string>();
  const stack = [requireId];
  while (stack.length) {
    const id = stack.pop()!;
    if (id === questId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(quests.get(id)?.requires ?? []));
  }
  return false;
}

/** Bloqueada: está en el tablón (no aceptada ni en espera) pero le faltan requisitos. */
export const isLocked = (q: QuestState, quests: QuestLookup): boolean =>
  q.status === "available" && !prerequisitesMet(q, quests);

/** Quests que piden `id` como requisito. */
export function dependents(id: string, quests: Iterable<QuestState>): QuestState[] {
  return [...quests].filter((q) => q.requires?.includes(id));
}

/** Quests que estaban bloqueadas en `before` y ya no lo están en `after` (para avisar al completar). */
export function unlockedBetween(before: Map<string, QuestState>, after: Map<string, QuestState>): QuestState[] {
  return [...after.values()].filter((q) => q.requires?.length && q.status !== "done" && !prerequisitesMet(q, before) && prerequisitesMet(q, after));
}

/** Quests que pueden ser requisito de una nueva: las que siguen en el tablón y aún no se han completado. */
/**
 * Quests que pueden ser requisito: las que siguen en el tablón y aún no se han completado.
 * Al editar una quest (`forQuest`), sin ella misma ni las que ya dependen de ella (círculos).
 */
export function requirementCandidates(quests: Iterable<QuestState>, forQuest?: string): QuestState[] {
  const all = [...quests];
  const lookup = new Map(all.map((q) => [q.id, q]));
  return all
    .filter((q) => q.status !== "done" && q.completions === 0)
    .filter((q) => !forQuest || (q.id !== forQuest && !wouldCycle(forQuest, q.id, lookup)))
    .sort((a, b) => a.createdAt - b.createdAt);
}

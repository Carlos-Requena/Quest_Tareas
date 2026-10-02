// Modelo puro de las rachas: cuántas veces seguidas has completado a tiempo una quest
// que se repite. Sin React, sin store, sin Tauri, sin DOM. No tiene eventos propios:
// la proyección la calcula en cada `quest_completed` (con el `ts` del evento).

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** La racha de una quest que se repite. */
export interface Streak {
  /** Veces seguidas a tiempo, contando la última. */
  count: number;
  /** La mejor racha que ha tenido. */
  best: number;
  /** Última vez que se completó (ts del evento). */
  lastAt: number;
  /** Hasta cuándo se puede volver a completar sin romperla (ms). */
  until: number;
}

/**
 * Margen para volver a completarla desde que vuelve al tablón: lo que dura su espera,
 * y al menos un día. Una diaria (20 h) que se hace a las 8 vuelve a las 4 de la
 * mañana siguiente y hay que hacerla antes de las 4 del día después.
 */
export const streakGrace = (cooldownMinutes: number | undefined) => Math.max((cooldownMinutes ?? 0) * 60_000, DAY);

/** Hasta cuándo dura la racha si se completa en `ts`. */
export const streakDeadline = (ts: number, cooldownMinutes: number | undefined) =>
  ts + Math.max(0, cooldownMinutes ?? 0) * 60_000 + streakGrace(cooldownMinutes);

/** La racha tras completar la quest en `ts`. Si se pasó del plazo, vuelve a empezar en 1. */
export function nextStreak(prev: Streak | undefined, ts: number, cooldownMinutes: number | undefined): Streak {
  const count = prev && ts <= prev.until ? prev.count + 1 : 1;
  return { count, best: Math.max(prev?.best ?? 0, count), lastAt: ts, until: streakDeadline(ts, cooldownMinutes) };
}

/** La racha en `now`: 0 si ya se rompió (no hace falta ningún evento para romperla). */
export const liveStreak = (s: Streak | undefined, now: number) => (s && now <= s.until ? s.count : 0);

/** Quedan pocas horas para romperla: menos de 6 h (o de la mitad del margen, si es corto). */
export function streakAtRisk(s: Streak | undefined, cooldownMinutes: number | undefined, now: number): boolean {
  if (!liveStreak(s, now) || !s) return false;
  return s.until - now <= Math.min(6 * HOUR, streakGrace(cooldownMinutes) / 2);
}

/** Rachas que se celebran. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365] as const;
export const isStreakMilestone = (n: number) => (STREAK_MILESTONES as readonly number[]).includes(n);

/** Desde cuántas se enseña la racha (una sola vez no es una racha). */
export const STREAK_SHOWN_FROM = 2;

/** Nivel visual de la llama: 0 (pequeña) … 3 (azul, a partir de 30). */
export const flameTier = (n: number) => (n >= 30 ? 3 : n >= 14 ? 2 : n >= 7 ? 1 : 0);

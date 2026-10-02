// Modelo puro de las quests complejas: sin React, sin store, sin Tauri, sin DOM.
// El dominio (src/domain) importa SOLO este archivo, nunca index.ts.
//
// Una quest «compleja» tiene reglas además de objetivos:
// - Repetición: tras completarla vuelve al tablón al cabo de un tiempo (en cualquier
//   categoría, no solo en las repetibles).
// - Requisitos: otras quests que hay que completar antes de poder aceptarla.

import type { QuestDef, QuestState } from "../../domain/types";

// ───────────── Repetición ─────────────

/** Vuelve al tablón tras completarla: las repetibles siempre; las demás, si tienen repetición. */
export const recurs = (q: Pick<QuestDef, "category" | "cooldownMinutes">): boolean =>
  q.category === "repeat" || (q.cooldownMinutes ?? 0) > 0;

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
  return !r || r.completions > 0;
}

export const prerequisitesMet = (q: Pick<QuestDef, "requires">, quests: QuestLookup): boolean =>
  (q.requires ?? []).every((id) => requirementMet(id, quests));

/** Requisitos que aún bloquean la quest, en su orden. */
export function blockers(q: Pick<QuestDef, "requires">, quests: QuestLookup): QuestState[] {
  return (q.requires ?? []).map((id) => quests.get(id)).filter((r): r is QuestState => !!r && r.completions === 0);
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
export function requirementCandidates(quests: Iterable<QuestState>): QuestState[] {
  return [...quests].filter((q) => q.status !== "done" && q.completions === 0).sort((a, b) => a.createdAt - b.createdAt);
}

// Modelo puro de los plazos: sin React, sin store, sin Tauri, sin DOM.
//
// Clasifica quests y encargos temporales según cuánto falta para su fecha:
// 1 día (o vencido), 7 días, 2 semanas, 1 mes y más de un mes. El plazo se calcula
// con la hora actual (`now` entra como parámetro): no se guarda ni genera eventos.

import type { QuestState } from "../../domain/types";
import { daysUntil, type TemporalState } from "../temporal/model";

/** Plazos, del más urgente al más lejano. Son excluyentes: cada fecha cae en uno solo. */
export const HORIZONS = ["day", "week", "fortnight", "month", "later"] as const;
export type Horizon = (typeof HORIZONS)[number];

/** Lo que se puede elegir en el filtro: todo, un plazo o (solo quests) sin fecha. */
export type HorizonFilter = "all" | Horizon | "none";

/** Último día natural de cada plazo (0 = hoy, 1 = mañana). Lo vencido cae en `day`. */
export const HORIZON_MAX_DAYS: Record<Horizon, number> = { day: 1, week: 7, fortnight: 14, month: 30, later: Infinity };

/** Una fecha con o sin hora. Las de todo el día vencen al acabar su día. */
export interface Due {
  dueAt: number;
  allDay: boolean;
}

/** Plazo de una fecha en `now`; `none` si no tiene fecha. */
export function horizonOf(due: Due | undefined, now: number): Horizon | "none" {
  if (!due) return "none";
  const days = daysUntil(due.dueAt, now);
  return HORIZONS.find((h) => days <= HORIZON_MAX_DAYS[h]) ?? "later";
}

/** Vencida: ya pasó (las de todo el día, al acabar su día). */
export function isOverdue(due: Due, now: number): boolean {
  return due.allDay ? daysUntil(due.dueAt, now) < 0 : now >= due.dueAt;
}

export const matchesHorizon = (filter: HorizonFilter, due: Due | undefined, now: number) =>
  filter === "all" || horizonOf(due, now) === filter;

/** Cuántos hay en cada plazo (y en total), para los contadores del filtro. */
export function countHorizons<T>(list: Iterable<T>, dueOf: (x: T) => Due | undefined, now: number): Record<HorizonFilter, number> {
  const n: Record<HorizonFilter, number> = { all: 0, day: 0, week: 0, fortnight: 0, month: 0, later: 0, none: 0 };
  for (const x of list) {
    n.all++;
    n[horizonOf(dueOf(x), now)]++;
  }
  return n;
}

/** Orden de las opciones del filtro. `none` solo tiene sentido en el tablón de quests. */
export const filtersFor = (withNone: boolean): HorizonFilter[] => ["all", ...HORIZONS, ...(withNone ? (["none"] as const) : [])];

// ───────────── Fecha de una quest ─────────────

/**
 * Fecha límite de una quest: la suya (todo el día) o la de su encargo temporal
 * pendiente, la que llegue antes. Las completadas del todo ya no tienen plazo.
 */
export function questDue(q: Pick<QuestState, "status" | "dueAt" | "temporalId">, temporals: Pick<Map<string, TemporalState>, "get">): (Due & { temporal?: TemporalState }) | undefined {
  if (q.status === "done") return undefined;
  const t = q.temporalId ? temporals.get(q.temporalId) : undefined;
  const own: Due | undefined = q.dueAt !== undefined ? { dueAt: q.dueAt, allDay: true } : undefined;
  const event = t?.status === "pending" ? { dueAt: t.dueAt, allDay: t.allDay, temporal: t } : undefined;
  if (own && event) return daysUntil(event.dueAt, own.dueAt) <= 0 ? event : own;
  return event ?? own;
}

/** Medianoche local del día que cae `days` días después del de `now` (respeta el cambio de hora). */
export function deadlineIn(days: number, now: number): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days).getTime();
}

/** Atajos del formulario de quest: fecha límite a N días de hoy (los mismos plazos del filtro). */
export const DEADLINE_PRESETS: { horizon: Horizon; days: number }[] = [
  { horizon: "day", days: 1 },
  { horizon: "week", days: 7 },
  { horizon: "fortnight", days: 14 },
  { horizon: "month", days: 30 },
];

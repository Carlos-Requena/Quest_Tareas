// Modelo puro del snapshot: sin React, sin store, sin Tauri.
// El snapshot es una CACHÉ de la proyección: los eventos siguen siendo la verdad.

import type { EventPos, GameEvent } from "../../domain/events";
import { comparePos } from "../../domain/events";
import { applyEvent, newProjectionAcc, PROJECTION_VERSION, type ProjectionAcc } from "../../domain/projection";
import { undoneIn } from "../undo/model";

/** Versión del formato guardado (la forma de este objeto y de su JSON). */
export const SNAPSHOT_FORMAT = 1;

/** Se guarda un snapshot nuevo cada tantos eventos desde el anterior. */
export const SNAPSHOT_EVERY = 100;

/** Estado de la proyección hasta un evento, listo para seguir aplicando los posteriores. */
export interface Snapshot {
  format: number;
  /** PROJECTION_VERSION con la que se calculó. */
  projection: number;
  /** Último evento incluido. */
  upTo: EventPos;
  /** Eventos incluidos: si la base tiene otro número hasta `upTo`, el snapshot no vale. */
  count: number;
  acc: ProjectionAcc;
  savedAt: number;
}

/** Proyección en memoria: el acumulador, hasta dónde llega y cuántos eventos lleva. */
export interface Projected {
  acc: ProjectionAcc;
  last?: EventPos;
  count: number;
}

export const emptyProjected = (): Projected => ({ acc: newProjectionAcc(), count: 0 });

/**
 * Aplica eventos ya ordenados y posteriores a `p.last` (modifica `p.acc`). Salta los que
 * otro evento de la lista deshizo (features/undo). Un deshacer cuyo evento quedó antes
 * de `p.last` no se puede aplicar así: quien llama tiene que reproducirlo todo (`hasUndo`).
 */
export function applyAll(p: Projected, events: GameEvent[]): Projected {
  const undone = undoneIn(events);
  for (const e of events) if (!undone.has(e.id)) applyEvent(p.acc, e);
  const tail = events[events.length - 1];
  return { acc: p.acc, last: tail ? { ts: tail.ts, id: tail.id } : p.last, count: p.count + events.length };
}

/** ¿Va `e` detrás de todo lo aplicado? Si no (reloj atrasado, evento remoto antiguo), hay que recalcular. */
export const goesAfter = (p: Pick<Projected, "last">, e: EventPos) => !p.last || comparePos(e, p.last) > 0;

/**
 * Copia profunda del acumulador. El store aplica cada evento nuevo sobre una copia:
 * el estado anterior no cambia y React ve objetos nuevos, como con project().
 */
export const cloneAcc = (acc: ProjectionAcc): ProjectionAcc => structuredClone(acc);

export function makeSnapshot(p: Projected, now: number): Snapshot | undefined {
  if (!p.last) return;
  return { format: SNAPSHOT_FORMAT, projection: PROJECTION_VERSION, upTo: p.last, count: p.count, acc: p.acc, savedAt: now };
}

/** ¿Lo calculó esta misma versión de la app? Uno de otra versión se descarta. */
export const isCurrent = (s: Snapshot) => s.format === SNAPSHOT_FORMAT && s.projection === PROJECTION_VERSION;

// ───────────── Serialización ─────────────
// JSON no conserva Map, Set, NaN ni ±Infinity: se marcan con una clave que no usa el modelo.

const TAG = "__snap";

function replacer(this: unknown, _key: string, v: unknown): unknown {
  if (v instanceof Map) return { [TAG]: "map", v: [...v] };
  if (v instanceof Set) return { [TAG]: "set", v: [...v] };
  if (typeof v === "number" && !Number.isFinite(v)) return { [TAG]: "num", v: String(v) };
  return v;
}

function reviver(_key: string, v: unknown): unknown {
  if (v && typeof v === "object" && TAG in v) {
    const { [TAG]: kind, v: data } = v as { [TAG]: string; v: unknown };
    if (kind === "map") return new Map(data as [unknown, unknown][]);
    if (kind === "set") return new Set(data as unknown[]);
    if (kind === "num") return Number(data);
  }
  return v;
}

export const encodeSnapshot = (s: Snapshot): string => JSON.stringify(s, replacer);

/** Lee un snapshot guardado. Si está corrupto o no tiene la forma esperada, devuelve undefined. */
export function decodeSnapshot(text: string | null | undefined): Snapshot | undefined {
  if (!text) return;
  try {
    const s = JSON.parse(text, reviver) as Snapshot;
    const ok =
      typeof s?.format === "number" &&
      typeof s.projection === "number" &&
      typeof s.count === "number" &&
      typeof s.upTo?.ts === "number" &&
      typeof s.upTo?.id === "string" &&
      s.acc?.quests instanceof Map &&
      s.acc.items?.catalog instanceof Map &&
      s.acc.temporals?.board instanceof Map &&
      s.acc.agenda?.entries instanceof Map &&
      Array.isArray(s.acc.chronicle?.entries);
    return ok ? s : undefined;
  } catch {
    return;
  }
}

/**
 * Forma canónica de cualquier valor (claves ordenadas, Map y Set como listas, sin
 * `undefined`), para comparar dos proyecciones sin que importe el orden de las claves.
 */
export function canonical(v: unknown): string {
  return JSON.stringify(v, function (this: unknown, key: string, val: unknown) {
    const out = replacer.call(this, key, val);
    if (out && typeof out === "object" && !Array.isArray(out)) {
      return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
    }
    return out;
  });
}

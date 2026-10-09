// Modelo puro del snapshot: sin React, sin store, sin Tauri.
// El snapshot es una CACHÉ de la proyección: los eventos siguen siendo la verdad.

import type { EventPos, GameEvent } from "../../domain/events";
import { comparePos } from "../../domain/events";
import { Immer, enableMapSet } from "immer";
import { applyEvent, applySettle, newProjectionAcc, pendingSettle, PROJECTION_VERSION, type ProjectionAcc } from "../../domain/projection";
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

// Copia selectiva (Immer): applyEvent escribe sobre un borrador y solo se copia lo que toca;
// lo demás se comparte con el acumulador anterior. Sin congelar el resultado: congelarlo
// recorre el árbol entero y nadie escribe en él fuera de un borrador (snapshot.test.ts lo
// comprueba congelándolo a propósito).
enableMapSet();
const immer = new Immer({ autoFreeze: false });

/**
 * Aplica UN evento nuevo, posterior a `p.last`, sin modificar `p`: el store lo usa en cada
 * dispatch (ADR-54). Copia solo las quests, encargos, objetos… que cambian, y lo que no
 * cambia conserva su identidad; si el evento no cambia nada, devuelve el mismo acumulador.
 * Un deshacer no se aplica así: quien llama tiene que reproducirlo todo.
 */
export function applyNext(p: Projected, e: GameEvent): Projected {
  let acc = immer.produce(p.acc, (draft) => applyEvent(draft as ProjectionAcc, e));
  // Lo que se deriva entre entidades se calcula leyendo, sin borrador, y solo se escribe lo que difiere.
  const settle = pendingSettle(acc);
  if (settle) acc = immer.produce(acc, (draft) => applySettle(draft as ProjectionAcc, settle));
  return { acc, last: { ts: e.ts, id: e.id }, count: p.count + 1 };
}

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

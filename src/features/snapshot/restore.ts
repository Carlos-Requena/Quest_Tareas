// Arranque con snapshot: cargarlo, comprobar que sigue valiendo y aplicar solo la cola.

import type { EventStore } from "../../storage/eventStore";
import { finishProjection } from "../../domain/projection";
import { applyAll, canonical, emptyProjected, isCurrent, makeSnapshot, type Projected } from "./model";
import { readSnapshot, writeSnapshot } from "./storage";
import { hasUndo } from "../undo/model";

export interface Restored extends Projected {
  /** Eventos que había en el snapshot usado (0 si se recalculó todo). */
  snapCount: number;
}

/**
 * Proyección al arrancar. Usa el snapshot si es de esta versión y la base tiene
 * exactamente sus eventos hasta `upTo`; si no, reproduce todos los eventos.
 */
export async function restore(store: EventStore): Promise<Restored> {
  const snap = await readSnapshot();
  if (snap && isCurrent(snap) && (await store.countUpTo(snap.upTo)) === snap.count) {
    const tail = await store.since(snap.upTo);
    // Un deshacer en la cola puede referirse a un evento que ya está dentro del snapshot.
    if (hasUndo(tail)) return rebuild(store);
    const p = applyAll({ acc: snap.acc, last: snap.upTo, count: snap.count }, tail);
    return { ...p, snapCount: snap.count };
  }
  return rebuild(store);
}

/** Todo desde cero, sin snapshot. También tras fusionar eventos anteriores a lo aplicado. */
export async function rebuild(store: EventStore): Promise<Restored> {
  return { ...applyAll(emptyProjected(), await store.all()), snapCount: 0 };
}

/** Guarda la proyección como snapshot (no hace nada si aún no hay eventos). */
export async function saveSnapshot(p: Projected): Promise<void> {
  const s = makeSnapshot(p, Date.now());
  if (s) await writeSnapshot(s);
}

/**
 * Solo en desarrollo: comprueba que snapshot + cola da lo mismo que reproducir todo.
 * Si no coincide, casi seguro que alguien cambió la proyección sin subir PROJECTION_VERSION.
 * Devuelve la proyección completa en ese caso, para sustituir a la otra.
 */
export async function verifyAgainstFull(store: EventStore, p: Projected): Promise<Projected | undefined> {
  const full = applyAll(emptyProjected(), await store.all());
  const a = canonical(finishProjection(p.acc));
  const b = canonical(finishProjection(full.acc));
  if (a === b && p.count === full.count) return;
  console.error(
    "[snapshot] El snapshot no coincide con los eventos. ¿Has cambiado project() sin subir PROJECTION_VERSION (src/domain/projection.ts)? Se usa la proyección completa.",
  );
  return full;
}

// Solo para tests: historiales de eventos aleatorios, pero reproducibles (con semilla).
// Mezclan eventos válidos con imposibles (completar sin aceptar, duplicados…) para que
// las guardas de project() también se ejerciten, y algunos con formatos antiguos.

import type { EventBody, GameEvent } from "../domain/events";
import type { QuestDef } from "../domain/types";
import { RARITIES, type ItemDef } from "../features/items/model";
import { TEMPORAL_KINDS, type TemporalDef } from "../features/temporal/model";
import { GEAR_SLOTS, type GearDef } from "../features/merchant/model";
import { seededRandom } from "../lib/id";

export const T0 = Date.UTC(2026, 0, 1);

export function questDef(id: string, extra: Partial<QuestDef> = {}): QuestDef {
  return {
    id,
    title: `Quest ${id}`,
    category: "request",
    description: "",
    client: "",
    area: "",
    kind: "",
    conditions: [{ id: `${id}-c`, kind: "count", label: "x", target: 2 }],
    reward: { xp: 150, gold: 30 },
    createdAt: T0,
    ...extra,
  };
}

export function itemDef(id: string, extra: Partial<ItemDef> = {}): ItemDef {
  return { id, name: `Item ${id}`, rarity: "common", kind: "", description: "", droppable: true, createdAt: T0, ...extra };
}

export function gearDef(id: string, extra: Partial<GearDef> = {}): GearDef {
  return { id, name: `Pieza ${id}`, slot: "head", rarity: "common", description: "", createdAt: T0, ...extra };
}

export function temporalDef(id: string, extra: Partial<TemporalDef> = {}): TemporalDef {
  return {
    id,
    title: `Encargo ${id}`,
    kind: "summons",
    difficulty: 3,
    dueAt: T0 + 7 * 86_400_000,
    allDay: true,
    place: "",
    notes: "",
    reward: { xp: 300, gold: 50 },
    attachments: [],
    questIds: [],
    createdAt: T0,
    ...extra,
  };
}

let seq = 0;
/** Un evento con hora exacta (para lo que depende del tiempo). Los ids crecen, así que los empates de `ts` respetan el orden de creación. */
export function at(ts: number, body: EventBody, deviceId = "test"): GameEvent {
  return { ...body, id: `t${String(seq++).padStart(6, "0")}`, deviceId, ts } as GameEvent;
}

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

/** Pone metadatos a una lista de cuerpos: un minuto entre cada uno. */
export function withMeta(bodies: EventBody[], start = T0): GameEvent[] {
  return bodies.map((b, i) => ({ ...b, id: `e${String(i).padStart(5, "0")}`, deviceId: "test", ts: start + i * 60_000 }) as GameEvent);
}

/** Historial aleatorio de `n` eventos, ya ordenado (ts, id), con empates de ts a propósito. */
export function randomStream(seed: string, n: number): GameEvent[] {
  const rnd = seededRandom(seed);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
  const Q = ["q0", "q1", "q2", "q3", "q4", "q5"];
  const I = ["i0", "i1", "i2", "i3"];
  const TT = ["t0", "t1", "t2"];
  const G = ["g0", "g1", "g2"];
  const cond = (q: string) => (rnd() < 0.85 ? `${q}-c` : `${q}-p`);

  // Mercader y equipo (features/merchant y features/equipment): precios pequeños para
  // que unas compras lleguen y otras no, según el oro que haya en ese momento.
  const gearBody = (): EventBody => {
    const g = pick(G);
    const r = rnd();
    if (r < 0.25) return { type: "gear_created", gear: gearDef(g, { slot: pick(GEAR_SLOTS), rarity: pick(RARITIES) }) };
    if (r < 0.35)
      return { type: "gear_updated", gearId: g, patch: rnd() < 0.5 ? { name: "Renombrada", rarity: pick(RARITIES) } : { slot: pick(GEAR_SLOTS) } };
    if (r < 0.4) return { type: "gear_deleted", gearId: g };
    if (r < 0.7) return { type: "gear_purchased", gearId: g, price: Math.floor(rnd() * 120) };
    if (r < 0.9) return { type: "gear_equipped", gearId: g };
    return { type: "gear_unequipped", slot: pick(GEAR_SLOTS) };
  };

  const body = (): EventBody => {
    if (rnd() < 0.12) return gearBody();
    const q = pick(Q);
    const r = rnd();
    if (r < 0.1)
      return {
        type: "quest_created",
        quest: questDef(q, {
          category: pick(["elite", "repeat", "request"] as const),
          // Áreas escritas de varias formas: los atributos las juntan (features/attributes).
          area: pick(["Salud", " salud ", "Estudio", ""]),
          conditions: [
            { id: `${q}-c`, kind: "count", label: "x", target: 1 + Math.floor(rnd() * 3) },
            // Pomodoro sin `kind` en algunos: formato antiguo de los contadores.
            ...(rnd() < 0.4 ? [{ id: `${q}-p`, kind: "pomodoro" as const, label: "p", target: 2, focusMinutes: 25, breakMinutes: 5 }] : []),
          ],
          // Recompensa antigua con `item` de texto (features/items/legacy.ts) en algunas.
          reward: rnd() < 0.3 ? ({ xp: 100, gold: 10, item: "Poción" } as QuestDef["reward"]) : { xp: 50 + Math.floor(rnd() * 400), gold: 20, itemId: rnd() < 0.5 ? pick(I) : undefined },
          cooldownMinutes: rnd() < 0.4 ? 30 : undefined,
          requires: rnd() < 0.3 ? [pick(Q)] : undefined,
          dueAt: rnd() < 0.3 ? T0 + Math.floor(rnd() * 40) * 86_400_000 : undefined,
        }),
      };
    if (r < 0.25) return { type: "quest_accepted", questId: q };
    if (r < 0.42) return { type: "progress_added", questId: q, conditionId: cond(q), amount: rnd() < 0.85 ? 1 : -1 };
    if (r < 0.55)
      return {
        type: "quest_completed",
        questId: q,
        reward: { xp: 50 + Math.floor(rnd() * 300), gold: 25, itemId: rnd() < 0.4 ? pick(I) : undefined },
        drops: rnd() < 0.6 ? [{ itemId: pick(I), rarity: pick(RARITIES) }] : undefined,
      };
    if (r < 0.6) return { type: "quest_abandoned", questId: q };
    if (r < 0.62) return { type: "quest_deleted", questId: q };
    if (r < 0.7) {
      const type = pick(["pomodoro_started", "pomodoro_paused", "pomodoro_resumed", "pomodoro_stopped", "pomodoro_break_skipped"] as const);
      // Sin conditionId en algunos: eventos de la versión anterior del pomodoro.
      return rnd() < 0.3 ? { type, questId: q } : { type, questId: q, conditionId: `${q}-p` };
    }
    if (r < 0.75) return { type: "item_created", item: itemDef(pick(I), { rarity: pick(RARITIES) }) };
    if (r < 0.77) return { type: "item_updated", itemId: pick(I), patch: { name: "Renombrado", rarity: pick(RARITIES) } };
    if (r < 0.78) return { type: "item_deleted", itemId: pick(I) };
    const t = pick(TT);
    if (r < 0.83)
      return { type: "temporal_created", temporal: temporalDef(t, { kind: pick(TEMPORAL_KINDS), questIds: rnd() < 0.5 ? [pick(Q)] : [] }) };
    if (r < 0.86) return { type: "temporal_updated", temporalId: t, patch: { title: "Editado", difficulty: 1 + Math.floor(rnd() * 5) } };
    if (r < 0.9) return { type: "temporal_linked", temporalId: t, questId: q };
    if (r < 0.92) return { type: "temporal_unlinked", temporalId: t, questId: q };
    if (r < 0.93)
      return { type: "temporal_attached", temporalId: t, attachment: { id: `a${Math.floor(rnd() * 3)}`, blobId: "sha", name: "f.pdf", mime: "application/pdf", size: 10, addedAt: T0 } };
    if (r < 0.94) return { type: "temporal_detached", temporalId: t, attachmentId: `a${Math.floor(rnd() * 3)}` };
    if (r < 0.99) return { type: "temporal_completed", temporalId: t, reward: { xp: 200, gold: 40 } };
    return { type: "temporal_deleted", temporalId: t };
  };

  let ts = T0;
  const out: GameEvent[] = [];
  for (let i = 0; i < n; i++) {
    // A veces el mismo ts que el anterior (desempata el id); a veces horas después (esperas vencidas).
    ts += rnd() < 0.1 ? 0 : rnd() < 0.8 ? 60_000 : 3 * 3_600_000;
    out.push({ ...body(), id: `${seed}-${String(i).padStart(5, "0")}`, deviceId: "test", ts } as GameEvent);
  }
  return out;
}

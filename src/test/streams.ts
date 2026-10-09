// Solo para tests: historiales de eventos aleatorios, pero reproducibles (con semilla).
// Mezclan eventos válidos con imposibles (completar sin aceptar, duplicados…) para que
// las guardas de project() también se ejerciten, y algunos con formatos antiguos.

import { EVENT_VERSION, type EventBody, type GameEvent } from "../domain/events";
import type { QuestDef } from "../domain/types";
import { RARITIES, type ItemDef } from "../features/items/model";
import { TEMPORAL_KINDS, type TemporalArt, type TemporalDef } from "../features/temporal/model";
import { GEAR_SLOTS, type GearDef } from "../features/merchant/model";
import type { AgendaDef } from "../features/agenda/model";
import type { CharacterDef, VoiceLine } from "../features/menu/model";
import type { CompanionLine } from "../features/companion/model";
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
  return { id, name: `Item ${id}`, rarity: "common", kind: "other", description: "", droppable: true, createdAt: T0, ...extra };
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
    contacts: [],
    createdAt: T0,
    ...extra,
  };
}

export function characterDef(id: string, extra: Partial<CharacterDef> = {}): CharacterDef {
  return { id, name: `Personaje ${id}`, art: { blobId: `blob-${id}`, mime: "image/webp", size: 1000 }, createdAt: T0, ...extra };
}

export function voiceLine(id: string, extra: Partial<VoiceLine> = {}): VoiceLine {
  return { id, characterId: "builtin:kazuma", part: "morning", text: `Frase ${id}`, createdAt: T0, ...extra };
}

export function companionLine(id: string, extra: Partial<CompanionLine> = {}): CompanionLine {
  return { id, characterId: "builtin:kazuma", situation: "due", text: `Frase ${id}`, createdAt: T0, ...extra };
}

export function temporalArt(id: string, extra: Partial<TemporalArt> = {}): TemporalArt {
  return { id, kind: "hunt", name: `Ilustración ${id}`, blobId: `art-${id}`, mime: "image/webp", size: 1000, createdAt: T0, ...extra };
}

export function agendaDef(id: string, extra: Partial<AgendaDef> = {}): AgendaDef {
  return { id, title: `Bloque ${id}`, date: "2026-01-05", start: 9 * 60, end: 10 * 60, notes: "", color: "gold", createdAt: T0, ...extra };
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
  // Una pieza de serie (features/armory): se compra y se equipa, pero no se crea ni se edita.
  const G = ["g0", "g1", "g2", "armory-pot_lid"];
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

  // Agenda (features/agenda): bloques sueltos y que se repiten, con datos mal formados a veces.
  const A = ["a0", "a1", "a2"];
  const agendaBody = (): EventBody => {
    const a = pick(A);
    const r = rnd();
    const day = `2026-01-${String(5 + Math.floor(rnd() * 20)).padStart(2, "0")}`;
    if (r < 0.35)
      return {
        type: "agenda_created",
        entry: agendaDef(a, {
          date: rnd() < 0.9 ? day : "2026-02-31",
          start: Math.floor(rnd() * 1500) - 30,
          end: Math.floor(rnd() * 1500),
          repeat: rnd() < 0.5 ? { days: rnd() < 0.3 ? [0, 1, 2, 3, 4, 5, 6] : [1, 3, 3, 9], until: rnd() < 0.3 ? "2026-01-20" : undefined } : undefined,
        }),
      };
    // Quitar la repetición va como días vacíos, como en la app: `undefined` no sobrevive al JSON de la sincronización.
    if (r < 0.6) return { type: "agenda_updated", entryId: a, patch: rnd() < 0.5 ? { title: "Movido", start: 600, end: 660 } : { repeat: { days: [] }, color: "elite" } };
    if (r < 0.85) return { type: "agenda_skipped", entryId: a, date: day };
    return { type: "agenda_deleted", entryId: a };
  };

  // Editar, fallar y deshacer (features/editing, failure y undo). Los fallos llegan a veces
  // antes de su plazo (la guarda los ignora) y los deshacer apuntan a uno de los últimos eventos.
  const laterBody = (i: number): EventBody => {
    const r = rnd();
    const q = pick(Q);
    if (r < 0.35)
      return {
        type: "quest_updated",
        questId: q,
        patch: pick([
          { title: "Editada", dueAt: null },
          { conditions: [{ id: `${q}-c`, kind: "count" as const, label: "y", target: 1 + Math.floor(rnd() * 4) }], category: pick(["elite", "repeat", "request"] as const) },
          { repeatDays: [1, 3, 5], requires: [pick(Q)] },
          { dueAt: T0 + Math.floor(rnd() * 10) * 86_400_000, cooldownMinutes: null, repeatDays: null },
        ]),
      };
    if (r < 0.55) return { type: "quest_failed", questId: q };
    if (r < 0.7) return { type: "temporal_failed", temporalId: pick(TT) };
    return { type: "event_undone", eventId: `${seed}-${String(Math.max(0, i - 1 - Math.floor(rnd() * 5))).padStart(5, "0")}` };
  };

  // Personajes del menú (features/menu): repetidos, quitados, de serie (prohibido) y sin imagen;
  // y sus frases: de personajes quitados, vacías, de una parte del día desconocida, editadas y quitadas.
  const C = ["c0", "c1", "builtin:kazuma"];
  const VL = ["l0", "l1", "l2"];
  const characterBody = (): EventBody => {
    const c = pick(C);
    const r = rnd();
    if (r < 0.35)
      return { type: "character_added", character: characterDef(c, rnd() < 0.15 ? { art: { blobId: "", mime: "image/webp", size: 0 } } : {}) };
    if (r < 0.5) return { type: "character_removed", characterId: c };
    if (r < 0.75)
      return {
        type: "voice_line_added",
        line: voiceLine(pick(VL), { characterId: c, part: pick(["morning", "afternoon", "evening", "night", "noon"] as never[]), text: pick(["Hola", "  ", "Buenas\nnoches"]) }),
      };
    if (r < 0.88) return { type: "voice_line_updated", lineId: pick(VL), text: pick(["Otra", ""]) };
    return { type: "voice_line_removed", lineId: pick(VL) };
  };

  // Cómo se mueve cada personaje (features/living): parches válidos, mezclados con campos
  // desconocidos o fuera de rango, de personajes quitados o que no existen, y restablecer.
  const styleBody = (): EventBody => {
    const c = pick([...C, "nadie"]);
    if (rnd() < 0.2) return { type: "character_style_reset", characterId: c };
    return {
      type: "character_style_set",
      characterId: c,
      style: pick([{ breath: 3 }, { wind: 0, aura: "jade" }, { particles: "petals", entrance: "gacha" }, { breath: 7, aura: "rosa" }, { fade: true, shine: false }, {}] as never[]),
    };
  };

  // El compañero de «Mi día» (features/companion): elegir (también a uno quitado o que no
  // existe) y volver al de hoy; frases de situaciones desconocidas, vacías, editadas y quitadas.
  const CL = ["k0", "k1", "k2"];
  const companionBody = (): EventBody => {
    const r = rnd();
    if (r < 0.25) return { type: "companion_chosen", ...(rnd() < 0.7 ? { characterId: pick([...C, "nadie"]) } : {}) };
    if (r < 0.65)
      return {
        type: "companion_line_added",
        line: companionLine(pick(CL), { characterId: pick(C), situation: pick(["tonight", "streak", "due", "clear", "boss"] as never[]), text: pick(["Vamos", " ", "Hoy\ntoca {{title}}"]) }),
      };
    if (r < 0.85) return { type: "companion_line_updated", lineId: pick(CL), text: pick(["Otra", ""]) };
    return { type: "companion_line_removed", lineId: pick(CL) };
  };

  // Ilustraciones de «Encargo cumplido» (features/temporal): repetidas, quitadas, sin imagen y de un tipo desconocido.
  const ARTS = ["a0", "a1"];
  const artBody = (): EventBody =>
    rnd() < 0.6
      ? { type: "temporal_art_added", art: temporalArt(pick(ARTS), { kind: pick([...TEMPORAL_KINDS, "boss"] as never[]), ...(rnd() < 0.15 ? { blobId: "" } : {}) }) }
      : { type: "temporal_art_removed", artId: pick(ARTS) };

  const body = (i: number): EventBody => {
    if (rnd() < 0.05) return characterBody();
    if (rnd() < 0.03) return styleBody();
    if (rnd() < 0.03) return companionBody();
    if (rnd() < 0.02) return artBody();
    if (rnd() < 0.12) return gearBody();
    if (rnd() < 0.06) return agendaBody();
    if (rnd() < 0.06) return laterBody(i);
    const q = pick(Q);
    const r = rnd();
    if (r < 0.1)
      return {
        type: "quest_created",
        quest: questDef(q, {
          category: pick(["elite", "repeat", "request"] as const),
          // Áreas escritas de varias formas: los atributos las juntan (features/attributes).
          area: pick(["Salud", " salud ", "健康", "Estudio", "Jardinería", ""]),
          conditions: [
            { id: `${q}-c`, kind: "count", label: "x", target: 1 + Math.floor(rnd() * 3) },
            // Pomodoro sin `kind` en algunos: formato antiguo de los contadores.
            ...(rnd() < 0.4 ? [{ id: `${q}-p`, kind: "pomodoro" as const, label: "p", target: 2, focusMinutes: 25, breakMinutes: 5 }] : []),
            // Lista (features/checklist), a veces con una casilla repetida o vacía que se limpia.
            ...(rnd() < 0.4
              ? [{ id: `${q}-l`, kind: "checklist" as const, label: "l", target: 9, items: [{ id: "a", text: "A" }, { id: "b", text: "B" }, { id: "a", text: "otra" }, { id: "c", text: " " }] }]
              : []),
          ],
          // Recompensa antigua con `item` de texto (features/items/legacy.ts) en algunas.
          reward: rnd() < 0.3 ? ({ xp: 100, gold: 10, item: "Poción" } as QuestDef["reward"]) : { xp: 50 + Math.floor(rnd() * 400), gold: 20, itemId: rnd() < 0.5 ? pick(I) : undefined },
          cooldownMinutes: rnd() < 0.4 ? 30 : undefined,
          // Repetición por días de la semana (features/complex), a veces con días que no valen.
          repeatDays: rnd() < 0.15 ? [1, 3, 9, 3] : undefined,
          requires: rnd() < 0.3 ? [pick(Q)] : undefined,
          dueAt: rnd() < 0.3 ? T0 + Math.floor(rnd() * 40) * 86_400_000 : undefined,
          // Contactos (features/contacts), a veces con uno repetido, vacío o de un tipo desconocido que se limpian.
          contacts:
            rnd() < 0.2
              ? ([
                  { id: "k1", kind: "phone", name: "Dentista", value: "+34 600 000 000" },
                  { id: "k1", kind: "email", name: "", value: "otra@x.es" },
                  { id: "k2", kind: "fax", name: "", value: "123" },
                  { id: "k3", kind: "email", name: "", value: "  " },
                ] as QuestDef["contacts"])
              : undefined,
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
    if (r < 0.58)
      return { type: "checklist_checked", questId: q, conditionId: rnd() < 0.9 ? `${q}-l` : `${q}-c`, itemId: pick(["a", "b", "c"]), done: rnd() < 0.8 };
    if (r < 0.6) return { type: "quest_abandoned", questId: q };
    if (r < 0.62) return { type: "quest_deleted", questId: q };
    if (r < 0.7) {
      const type = pick(["pomodoro_started", "pomodoro_paused", "pomodoro_resumed", "pomodoro_stopped", "pomodoro_break_skipped"] as const);
      // Sin conditionId en algunos: eventos de la versión anterior del pomodoro.
      return rnd() < 0.3 ? { type, questId: q } : { type, questId: q, conditionId: `${q}-p` };
    }
    // Imagen nítida (features/items): i1 nace con ella; al editar, i1 trae otra e i2 cambia de icono sin ella (se pierde).
    // Sin tiradas nuevas: depende del objeto elegido, para no mover el resto del historial.
    const art = (id: string) => ({ image: `data:image/png;base64,${id}`, art: { blobId: `blob-${id}`, mime: "image/webp", size: 10 } });
    if (r < 0.75) {
      const id = pick(I);
      return { type: "item_created", item: itemDef(id, { rarity: pick(RARITIES), ...(id === "i1" ? art(id) : {}) }) };
    }
    if (r < 0.77) {
      const id = pick(I);
      const extra = id === "i1" ? art(`${id}b`) : id === "i2" ? { image: "data:image/png;base64,otro" } : {};
      return { type: "item_updated", itemId: id, patch: { name: "Renombrado", rarity: pick(RARITIES), ...extra } };
    }
    if (r < 0.775) return { type: "item_deleted", itemId: pick(I) };
    // Coleccionables (features/collectibles): unas compras llegan y otras no, según el oro y lo que ya tengas.
    if (r < 0.78) return { type: "collectible_purchased", itemId: pick(I), price: Math.floor(rnd() * 80) };
    const t = pick(TT);
    if (r < 0.83)
      return {
        type: "temporal_created",
        // Sin aceptar en algunos: sus quests quedan en reserva hasta `temporal_accepted`.
        temporal: temporalDef(t, { kind: pick(TEMPORAL_KINDS), questIds: rnd() < 0.5 ? [pick(Q)] : [], ...(rnd() < 0.4 ? { planned: true } : {}) }),
      };
    if (r < 0.86) return { type: "temporal_updated", temporalId: t, patch: { title: "Editado", difficulty: 1 + Math.floor(rnd() * 5) } };
    if (r < 0.9) return { type: "temporal_linked", temporalId: t, questId: q };
    if (r < 0.92) return { type: "temporal_unlinked", temporalId: t, questId: q };
    if (r < 0.93)
      return { type: "temporal_attached", temporalId: t, attachment: { id: `a${Math.floor(rnd() * 3)}`, blobId: "sha", name: "f.pdf", mime: "application/pdf", size: 10, addedAt: T0 } };
    if (r < 0.94) return { type: "temporal_detached", temporalId: t, attachmentId: `a${Math.floor(rnd() * 3)}` };
    if (r < 0.96) return { type: "temporal_completed", temporalId: t, reward: { xp: 200, gold: 40 } };
    if (r < 0.985) return { type: "temporal_accepted", temporalId: t };
    if (r < 0.995) return { type: "temporal_postponed", temporalId: t };
    return { type: "temporal_deleted", temporalId: t };
  };

  let ts = T0;
  const out: GameEvent[] = [];
  for (let i = 0; i < n; i++) {
    // A veces el mismo ts que el anterior (desempata el id); a veces horas después (esperas vencidas).
    ts += rnd() < 0.1 ? 0 : rnd() < 0.8 ? 60_000 : 3 * 3_600_000;
    // Versión del formato (domain/upcast.ts): la mayoría sin `v` (anteriores a la 1), algunos
    // con la actual y unos pocos de una versión futura, que la proyección ignora.
    const v = i % 13 === 7 ? EVENT_VERSION + 1 : i % 3 === 0 ? EVENT_VERSION : undefined;
    out.push({ ...body(i), id: `${seed}-${String(i).padStart(5, "0")}`, deviceId: "test", ts, ...(v ? { v } : {}) } as GameEvent);
  }
  return out;
}

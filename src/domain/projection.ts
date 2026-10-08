import type { GameEvent } from "./events";
import type { ConditionDef, GameState, QuestState } from "./types";
import { isCountCondition, isPomodoroCondition } from "./types";
import { isFromFuture, upcastEvent } from "./upcast";
import { levelFromXp, rankFor } from "./leveling";
import { applyPomodoroEvent, newPomodoro, planOf, viewPomodoro } from "../features/pomodoro/model";
import { upcastQuestDef } from "../features/pomodoro/legacy";
import { applyItemEvent, newItemsAcc, receiveItems, registerItem, type ItemsAcc } from "../features/items/model";
import { upcastReward } from "../features/items/legacy";
import { applyTemporalEvent, inReserve, isAccepted, linkedQuestDone, newTemporalAcc, questOwners, type TemporalAcc } from "../features/temporal/model";
import { cleanRepeatDays, cleanRequires, prerequisitesMet, recurs, returnsAt, streakUntil } from "../features/complex/model";
import { applyMerchantEvent, fullCatalog, gearOf, newMerchantAcc, type MerchantAcc } from "../features/merchant/model";
import { applyEquipmentEvent, newEquipmentAcc, pruneEquipment, type EquipmentAcc } from "../features/equipment/model";
import { gainAttribute, listAttributes, newAttributesAcc, type AttributesAcc } from "../features/attributes/model";
import { applyCheck, checklistProgress, cleanChecklist, isChecklistCondition } from "../features/checklist/model";
import { nextStreak } from "../features/streaks/model";
import { newChronicleAcc, noteStart, record, type ChronicleAcc, type ChronicleFind } from "../features/chronicle/model";
import { questReward, temporalValue } from "../features/rewards/model";
import { applyCollectibleEvent } from "../features/collectibles/model";
import { cleanContacts } from "../features/contacts/model";
import { applyAgendaEvent, newAgendaAcc, type AgendaAcc } from "../features/agenda/model";
import { BUILTIN_PREFIX, applyCharacterEvent, newCharactersAcc, type CharactersAcc } from "../features/menu/model";
import { applyStyleEvent, newStylesAcc, type StylesAcc } from "../features/living/model";
import { applyCompanionEvent, dropCompanionOf, newCompanionAcc, type CompanionAcc } from "../features/companion/model";
import { isEditable, patchQuest } from "../features/editing/model";
import { questFailsBy, temporalFailsBy } from "../features/failure/model";
import { undoneIn } from "../features/undo/model";

/**
 * Versión de la lógica de la proyección. Un snapshot guardado con otra versión se
 * descarta y se recalcula todo desde los eventos (features/snapshot).
 *
 * NORMA: súbela si cambias el resultado de project() para eventos ya guardados:
 * un `case`, una guarda, un upcaster (legacy.ts) o un apply*Event de una funcionalidad.
 */
export const PROJECTION_VERSION = 13;

/**
 * Acumulador de la proyección: lo que se va calculando al reproducir los eventos.
 * Solo datos serializables (Map, Set y objetos planos), para poder guardarlo como snapshot.
 */
export interface ProjectionAcc {
  quests: Map<string, QuestState>;
  /** Quests retiradas: crear otra vez el mismo id no la devuelve (los ejemplos de otro equipo, features/sync). */
  deletedQuests: Set<string>;
  items: ItemsAcc;
  temporals: TemporalAcc;
  merchant: MerchantAcc;
  equipment: EquipmentAcc;
  attributes: AttributesAcc;
  chronicle: ChronicleAcc;
  /** Agenda personal (features/agenda): no toca al jugador. */
  agenda: AgendaAcc;
  /** Personajes del menú añadidos por el jugador y sus frases (features/menu): no tocan al jugador. */
  characters: CharactersAcc;
  /** Cómo se mueve cada personaje (features/living): no toca al jugador. */
  styles: StylesAcc;
  /** El compañero de «Mi día» y sus frases (features/companion): no toca al jugador. */
  companion: CompanionAcc;
  xp: number;
  gold: number;
  completedCount: number;
}

export const newProjectionAcc = (): ProjectionAcc => ({
  quests: new Map(),
  deletedQuests: new Set(),
  items: newItemsAcc(),
  temporals: newTemporalAcc(),
  merchant: newMerchantAcc(),
  equipment: newEquipmentAcc(),
  attributes: newAttributesAcc(),
  chronicle: newChronicleAcc(),
  agenda: newAgendaAcc(),
  characters: newCharactersAcc(),
  styles: newStylesAcc(),
  companion: newCompanionAcc(),
  xp: 0,
  gold: 0,
  completedCount: 0,
});

/**
 * Reproduce los eventos (ya ordenados) y devuelve el estado actual del juego. Los que
 * otro evento deshizo (features/undo) se saltan, como si no hubieran pasado.
 */
export function project(events: GameEvent[]): GameState {
  const acc = newProjectionAcc();
  const undone = undoneIn(events);
  for (const e of events) if (!undone.has(e.id)) applyEvent(acc, e);
  return finishProjection(acc);
}

/**
 * Aplica UN evento sobre el acumulador (lo modifica). project() es aplicar todos en
 * orden; el store aplica solo el nuevo sobre una copia del anterior (features/snapshot).
 */
export function applyEvent(acc: ProjectionAcc, raw: GameEvent): void {
  // De una versión más nueva de la app: no se sabe interpretar (domain/upcast.ts).
  if (isFromFuture(raw)) return;
  const e = upcastEvent(raw);
  const { quests, items, temporals } = acc;
  // Para los encargos con quests enlazadas: una quest que ya no existe no bloquea.
  const linkDone = (questId: string, since: number) => {
    const q = quests.get(questId);
    return !q || linkedQuestDone(q, since);
  };

  const q = "questId" in e ? quests.get(e.questId) : undefined;
  // El primer evento es el día 1 de la crónica.
  noteStart(acc.chronicle, e.ts);

  switch (e.type) {
    case "quest_created":
      if (!quests.has(e.quest.id) && !acc.deletedQuests.has(e.quest.id)) {
        // datos antiguos → formato actual
        const def = upcastQuestDef(e.quest);
        const { reward, item } = upcastReward(def.reward, e.ts);
        if (item) registerItem(items, item);
        // Listas con casillas válidas (features/checklist).
        const conditions = def.conditions.map((c) => (isChecklistCondition(c) ? cleanChecklist(c) : c));
        // Contactos limpios (features/contacts); sin ninguno, el campo no está.
        const contacts = cleanContacts(def.contacts);
        quests.set(def.id, {
          ...def,
          conditions,
          requires: cleanRequires(def),
          repeatDays: cleanRepeatDays(def.repeatDays),
          dueAt: Number.isFinite(def.dueAt) ? def.dueAt : undefined,
          contacts: contacts.length ? contacts : undefined,
          // XP y oro salen de los objetivos (features/rewards); lo que trae el evento solo aporta el objeto.
          reward: questReward({ category: def.category, conditions, reward }),
          status: "available",
          progress: {},
          pomodoros: freshPomodoros(def.conditions),
          checked: {},
          completions: 0,
        });
      }
      break;

    case "quest_deleted":
      if (quests.delete(e.questId)) acc.deletedQuests.add(e.questId);
      break;

    case "quest_accepted":
      // Una quest con requisitos no se puede aceptar hasta completarlos (features/complex),
      // ni una en reserva hasta aceptar su encargo (features/temporal).
      if (
        q &&
        (q.status === "available" ||
          (q.status === "cooldown" && e.ts >= (q.availableAt ?? 0))) &&
        prerequisitesMet(q, quests) &&
        !inReserve(temporals, q.id)
      ) {
        q.status = "active";
        q.acceptedAt = e.ts;
        q.progress = {};
        q.checked = {};
        q.pomodoros = freshPomodoros(q.conditions);
      }
      break;

    case "quest_abandoned":
      if (q?.status === "active") {
        q.status = q.availableAt && q.availableAt > e.ts ? "cooldown" : "available";
        q.progress = {};
        q.checked = {};
        q.acceptedAt = undefined;
        q.pomodoros = freshPomodoros(q.conditions);
      }
      break;

    case "progress_added":
      if (q?.status === "active") {
        const cond = q.conditions.find((c) => c.id === e.conditionId);
        // Solo los contadores: el pomodoro avanza con el tiempo y la lista, casilla a casilla.
        if (cond && isCountCondition(cond)) {
          const next = (q.progress[cond.id] ?? 0) + e.amount;
          q.progress = {
            ...q.progress,
            [cond.id]: Math.max(0, Math.min(cond.target, next)),
          };
        }
      }
      break;

    case "checklist_checked":
      // Marcar o desmarcar una casilla de una lista, solo con la quest en curso.
      if (q?.status === "active") {
        const cond = q.conditions.find((c) => c.id === e.conditionId);
        if (cond && isChecklistCondition(cond)) q.checked = applyCheck(q.checked, cond, e.itemId, e.done === true);
      }
      break;

    case "quest_completed":
      // Si dos dispositivos completan la misma quest sin conexión, solo
      // cuenta la primera: la segunda ya no la encuentra activa.
      if (q?.status === "active") {
        const { reward, item } = upcastReward(e.reward, e.ts);
        if (item) registerItem(items, item);
        acc.xp += reward.xp;
        acc.gold += reward.gold;
        const known = new Set(Object.keys(items.discovered));
        receiveItems(items, reward.itemId, e.drops ?? [], e.ts);
        // Objetos vistos por primera vez, para la crónica (features/chronicle).
        const found: ChronicleFind[] = [];
        for (const id of Object.keys(items.discovered)) {
          const it = items.catalog.get(id);
          if (!known.has(id) && it) found.push({ id, name: it.name, rarity: it.rarity });
        }
        // La XP también sube el atributo del área de la quest (features/attributes).
        gainAttribute(acc.attributes, q.area, reward.xp, e.ts);
        acc.completedCount++;
        q.completions++;
        q.lastCompletedAt = e.ts;
        q.progress = {};
        q.checked = {};
        q.acceptedAt = undefined;
        q.pomodoros = freshPomodoros(q.conditions);
        // Las repetibles, y cualquier quest con repetición, vuelven tras su espera.
        if (recurs(q)) {
          q.status = "cooldown";
          // Tras su espera, o el siguiente día de la semana que toca (features/complex).
          q.availableAt = returnsAt(q, e.ts);
          // Racha: veces seguidas a tiempo (features/streaks).
          q.streak = nextStreak(q.streak, e.ts, q.cooldownMinutes, streakUntil(q, e.ts));
        } else {
          q.status = "done";
        }
        record(acc.chronicle, {
          k: "quest",
          ts: e.ts,
          xpAfter: acc.xp,
          questId: q.id,
          title: q.title,
          category: q.category,
          area: q.area || undefined,
          xp: reward.xp,
          gold: reward.gold,
          drops: (e.drops ?? []).length,
          found: found.length ? found : undefined,
          streak: q.streak && recurs(q) ? q.streak.count : undefined,
        });
      }
      break;

    case "quest_updated":
      // Editar (features/editing): las terminadas no; en curso, sin tocar los objetivos ni la repetición.
      if (q && isEditable(q)) {
        const def = patchQuest(q, e.patch, q.status === "active", quests);
        // Objetivos nuevos: sus pomodoros empiezan de cero (en curso no pueden cambiar).
        const fresh = def.conditions !== q.conditions ? { progress: {}, checked: {}, pomodoros: freshPomodoros(def.conditions) } : {};
        quests.set(q.id, { ...q, ...def, ...fresh });
      }
      break;

    case "quest_failed":
      // Se fractura al acabar el día de su fecha límite sin completarla (features/failure).
      if (q && questFailsBy(q, e.ts)) {
        failQuest(q, e.ts);
        record(acc.chronicle, { k: "failed", target: "quest", ts: e.ts, xpAfter: acc.xp, id: q.id, title: q.title, category: q.category });
      }
      break;

    case "temporal_failed": {
      // El cartel se quema al acabar su día sin cumplirlo; sus quests sin terminar fallan con él.
      const t = temporals.board.get(e.temporalId);
      if (!t || !temporalFailsBy(t, e.ts)) break;
      let lost = 0;
      for (const id of t.questIds) {
        const lq = quests.get(id);
        // Las que se repiten siguen en el tablón: son costumbres, no parte del encargo.
        if (lq && lq.status !== "done" && !recurs(lq)) {
          failQuest(lq, e.ts);
          lost++;
        }
      }
      temporals.board.set(t.id, { ...t, status: "done", failedAt: e.ts });
      record(acc.chronicle, { k: "failed", target: "temporal", ts: e.ts, xpAfter: acc.xp, id: t.id, title: t.title, skulls: t.difficulty, quests: lost || undefined });
      break;
    }

    case "event_undone":
      // No hace nada aquí: project() y features/snapshot saltan el evento deshecho al reproducirlo todo.
      break;

    case "pomodoro_started":
    case "pomodoro_paused":
    case "pomodoro_resumed":
    case "pomodoro_stopped":
    case "pomodoro_break_skipped":
      if (q?.status === "active") {
        // Eventos antiguos sin conditionId → la primera condición de pomodoro.
        const cond = q.conditions.find((c) => (e.conditionId ? c.id === e.conditionId : isPomodoroCondition(c)));
        const p = cond && q.pomodoros[cond.id];
        if (cond && isPomodoroCondition(cond) && p) {
          q.pomodoros = { ...q.pomodoros, [cond.id]: applyPomodoroEvent(p, planOf(cond), e) };
        }
      }
      break;

    case "item_created":
    case "item_updated":
    case "item_deleted":
      applyItemEvent(items, e);
      break;

    case "temporal_created":
    case "temporal_updated":
    case "temporal_attached":
    case "temporal_detached":
    case "temporal_linked":
    case "temporal_unlinked":
    case "temporal_accepted":
    case "temporal_postponed":
    case "temporal_completed":
    case "temporal_deleted":
    case "temporal_art_added":
    case "temporal_art_removed": {
      // Cumplir un encargo temporal también da XP y oro (copiados en el evento).
      // Solo se puede si sus quests enlazadas están terminadas.
      const earned = applyTemporalEvent(temporals, e, e.ts, linkDone);
      if (earned) {
        acc.xp += earned.xp;
        acc.gold += earned.gold;
        const t = temporals.board.get((e as { temporalId: string }).temporalId);
        if (t)
          record(acc.chronicle, { k: "temporal", ts: e.ts, xpAfter: acc.xp, temporalId: t.id, title: t.title, skulls: t.difficulty, xp: earned.xp, gold: earned.gold });
      }
      break;
    }

    case "gear_created":
    case "gear_updated":
    case "gear_deleted":
    case "gear_purchased":
      // Comprar al mercader gasta oro, solo si llega (features/merchant).
      {
        const had = e.type === "gear_purchased" && !!acc.merchant.owned[e.gearId];
        const spent = applyMerchantEvent(acc.merchant, e, e.ts, acc.gold);
        acc.gold -= spent;
        const bought = e.type === "gear_purchased" && !had && !!acc.merchant.owned[e.gearId];
        const g = bought ? gearOf(acc.merchant, e.gearId) : undefined;
        if (g) record(acc.chronicle, { k: "purchase", ts: e.ts, xpAfter: acc.xp, gearId: g.id, name: g.name, rarity: g.rarity, price: spent });
      }
      // Una pieza retirada o que cambia de ranura deja de estar puesta.
      if (e.type === "gear_updated" || e.type === "gear_deleted") pruneEquipment(acc.equipment, acc.merchant);
      break;

    case "gear_equipped":
    case "gear_unequipped":
      applyEquipmentEvent(acc.equipment, acc.merchant, e);
      break;

    case "agenda_created":
    case "agenda_updated":
    case "agenda_skipped":
    case "agenda_deleted":
      // La agenda es para organizarse: no da XP ni oro.
      applyAgendaEvent(acc.agenda, e);
      break;

    case "character_removed":
      // Su estilo y sus frases de compañero se van con él (las del menú las quita applyCharacterEvent).
      if (acc.characters.list.has(e.characterId)) {
        acc.styles.delete(e.characterId);
        dropCompanionOf(acc.companion, e.characterId);
      }
      applyCharacterEvent(acc.characters, e);
      break;
    case "character_added":
    case "voice_line_added":
    case "voice_line_updated":
    case "voice_line_removed":
      // Los personajes del menú y lo que dicen son decoración: no dan XP ni oro.
      applyCharacterEvent(acc.characters, e);
      break;

    case "character_style_set":
    case "character_style_reset":
      // Cómo se mueve un personaje (features/living): decoración.
      applyStyleEvent(acc.styles, e, (id) => characterExists(acc.characters, id));
      break;

    case "companion_chosen":
    case "companion_line_added":
    case "companion_line_updated":
    case "companion_line_removed":
      // El compañero de «Mi día» (features/companion): decoración.
      applyCompanionEvent(acc.companion, e, (id) => characterExists(acc.characters, id));
      break;

    case "collectible_purchased": {
      // Comprar un coleccionable gasta oro, solo si llega y aún no lo tienes (features/collectibles).
      const spent = applyCollectibleEvent(items, e, e.ts, acc.gold);
      const it = items.catalog.get(e.itemId);
      if (spent === undefined || !it) break;
      acc.gold -= spent;
      record(acc.chronicle, { k: "purchase", ts: e.ts, xpAfter: acc.xp, gearId: it.id, collectible: true, name: it.name, rarity: it.rarity, price: spent });
      break;
    }
  }
}

/** Un personaje existe: los de serie siempre (están en public/menu/); los añadidos, mientras no se quiten. */
const characterExists = (c: CharactersAcc, id: string) => id.startsWith(BUILTIN_PREFIX) || c.list.has(id);

/**
 * Cierra la proyección: lo que se deriva del acumulador entero (nivel, rango, huecos,
 * el encargo de cada quest y si está en reserva). Se puede llamar después de cada evento.
 */
export function finishProjection(acc: ProjectionAcc): GameState {
  const { quests, items, temporals, merchant, equipment, attributes, chronicle, agenda, characters, styles, companion, xp, gold, completedCount } = acc;
  // Cada quest sabe a qué encargo pendiente pertenece (para su fecha y su enlace).
  // Se recalcula entero: tras desenlazar o cumplir un encargo, la quest ya no lo tiene.
  // Las de un encargo sin aceptar quedan en reserva, salvo las que ya estén en curso.
  const owners = questOwners(temporals.board.values());
  for (const q of quests.values()) {
    const temporalId = owners.get(q.id);
    if (temporalId) q.temporalId = temporalId;
    else delete q.temporalId;
    const owner = temporalId ? temporals.board.get(temporalId) : undefined;
    if (owner && !isAccepted(owner) && q.status !== "active" && q.status !== "done") q.reserved = true;
    else delete q.reserved;
  }
  // Lo que vale un encargo pendiente depende de sus quests enlazadas (features/rewards).
  for (const t of temporals.board.values()) {
    if (t.status !== "pending") continue;
    const linked = t.questIds.flatMap((id) => quests.get(id)?.reward ?? []);
    t.reward = temporalValue(t.difficulty, linked);
  }

  const lv = levelFromXp(xp);
  return {
    quests,
    items: items.catalog,
    temporals: temporals.board,
    temporalArts: temporals.arts,
    gear: fullCatalog(merchant),
    chronicle,
    agenda: agenda.entries,
    characters: characters.list,
    voiceLines: characters.lines,
    characterStyles: styles,
    companion: { chosen: companion.chosen, lines: companion.lines },
    player: {
      xp,
      gold,
      ...lv,
      rank: rankFor(lv.level),
      inventory: items.inventory,
      discovered: items.discovered,
      pity: items.pity,
      collectiblesBought: items.bought,
      completedCount,
      owned: merchant.owned,
      equipped: equipment.equipped,
      attributes: listAttributes(attributes),
    },
  };
}

/** El estado "cooldown" caduca con el paso del tiempo, sin necesidad de eventos. */
export function effectiveStatus(q: QuestState, now: number) {
  if (q.status === "cooldown" && now >= (q.availableAt ?? 0)) return "available";
  return q.status;
}

/** La quest se fractura: termina sin recompensa y sale del tablón (features/failure). */
function failQuest(q: QuestState, ts: number) {
  q.status = "done";
  q.failedAt = ts;
  q.progress = {};
  q.checked = {};
  q.acceptedAt = undefined;
  q.pomodoros = freshPomodoros(q.conditions);
}

/** Un pomodoro nuevo por cada condición de pomodoro. */
function freshPomodoros(conditions: ConditionDef[]): QuestState["pomodoros"] {
  return Object.fromEntries(conditions.filter(isPomodoroCondition).map((c) => [c.id, newPomodoro()]));
}

/** Progreso de una condición en `now`: contador, casillas marcadas o rondas de pomodoro completadas. */
export function conditionProgress(q: QuestState, c: ConditionDef, now: number): number {
  if (isChecklistCondition(c)) return checklistProgress(q.checked ?? {}, c);
  if (!isPomodoroCondition(c)) return q.progress[c.id] ?? 0;
  const p = q.pomodoros[c.id];
  return p ? viewPomodoro(p, planOf(c), now).completedRounds : 0;
}

/** Las condiciones que no dependen del tiempo (contadores y listas) están cumplidas; las de pomodoro, aparte. */
export function countConditionsMet(q: QuestState): boolean {
  return q.conditions.every((c) => isPomodoroCondition(c) || conditionProgress(q, c, 0) >= c.target);
}

/** Se puede reportar: todas las condiciones cumplidas, pomodoros incluidos. */
export function conditionsMet(q: QuestState, now: number): boolean {
  return q.conditions.every((c) => conditionProgress(q, c, now) >= c.target);
}

import type { GameEvent } from "./events";
import type { ConditionDef, GameState, QuestState } from "./types";
import { isCountCondition, isPomodoroCondition } from "./types";
import { isFromFuture, upcastEvent } from "./upcast";
import { levelFromXp, maxActiveFor, rankFor } from "./leveling";
import { applyPomodoroEvent, newPomodoro, planOf, viewPomodoro } from "../features/pomodoro/model";
import { upcastQuestDef } from "../features/pomodoro/legacy";
import { applyItemEvent, newItemsAcc, receiveItems, registerItem, type ItemsAcc } from "../features/items/model";
import { upcastReward } from "../features/items/legacy";
import { applyTemporalEvent, linkedQuestDone, newTemporalAcc, questOwners, type TemporalAcc } from "../features/temporal/model";
import { cleanRequires, prerequisitesMet, recurs } from "../features/complex/model";
import { applyMerchantEvent, fullCatalog, gearOf, newMerchantAcc, type MerchantAcc } from "../features/merchant/model";
import { applyEquipmentEvent, newEquipmentAcc, pruneEquipment, type EquipmentAcc } from "../features/equipment/model";
import { gainAttribute, listAttributes, newAttributesAcc, type AttributesAcc } from "../features/attributes/model";
import { applyCheck, checklistProgress, cleanChecklist, isChecklistCondition } from "../features/checklist/model";
import { nextStreak } from "../features/streaks/model";
import { newChronicleAcc, noteStart, record, type ChronicleAcc, type ChronicleFind } from "../features/chronicle/model";

/**
 * Versión de la lógica de la proyección. Un snapshot guardado con otra versión se
 * descarta y se recalcula todo desde los eventos (features/snapshot).
 *
 * NORMA: súbela si cambias el resultado de project() para eventos ya guardados:
 * un `case`, una guarda, un upcaster (legacy.ts) o un apply*Event de una funcionalidad.
 */
export const PROJECTION_VERSION = 3;

/**
 * Acumulador de la proyección: lo que se va calculando al reproducir los eventos.
 * Solo datos serializables (Map, Set y objetos planos), para poder guardarlo como snapshot.
 */
export interface ProjectionAcc {
  quests: Map<string, QuestState>;
  items: ItemsAcc;
  temporals: TemporalAcc;
  merchant: MerchantAcc;
  equipment: EquipmentAcc;
  attributes: AttributesAcc;
  chronicle: ChronicleAcc;
  xp: number;
  gold: number;
  completedCount: number;
}

export const newProjectionAcc = (): ProjectionAcc => ({
  quests: new Map(),
  items: newItemsAcc(),
  temporals: newTemporalAcc(),
  merchant: newMerchantAcc(),
  equipment: newEquipmentAcc(),
  attributes: newAttributesAcc(),
  chronicle: newChronicleAcc(),
  xp: 0,
  gold: 0,
  completedCount: 0,
});

/** Reproduce los eventos (ya ordenados) y devuelve el estado actual del juego. */
export function project(events: GameEvent[]): GameState {
  const acc = newProjectionAcc();
  for (const e of events) applyEvent(acc, e);
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
      if (!quests.has(e.quest.id)) {
        // datos antiguos → formato actual
        const def = upcastQuestDef(e.quest);
        const { reward, item } = upcastReward(def.reward, e.ts);
        if (item) registerItem(items, item);
        quests.set(def.id, {
          ...def,
          // Listas con casillas válidas (features/checklist).
          conditions: def.conditions.map((c) => (isChecklistCondition(c) ? cleanChecklist(c) : c)),
          requires: cleanRequires(def),
          dueAt: Number.isFinite(def.dueAt) ? def.dueAt : undefined,
          reward,
          status: "available",
          progress: {},
          pomodoros: freshPomodoros(def.conditions),
          checked: {},
          completions: 0,
        });
      }
      break;

    case "quest_deleted":
      quests.delete(e.questId);
      break;

    case "quest_accepted":
      // Una quest con requisitos no se puede aceptar hasta completarlos (features/complex).
      if (
        q &&
        (q.status === "available" ||
          (q.status === "cooldown" && e.ts >= (q.availableAt ?? 0))) &&
        prerequisitesMet(q, quests)
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
          q.availableAt = e.ts + (q.cooldownMinutes ?? 0) * 60_000;
          // Racha: veces seguidas a tiempo (features/streaks).
          q.streak = nextStreak(q.streak, e.ts, q.cooldownMinutes);
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
    case "temporal_completed":
    case "temporal_deleted": {
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
  }
}

/**
 * Cierra la proyección: lo que se deriva del acumulador entero (nivel, rango, huecos
 * y el encargo de cada quest). Se puede llamar después de cada evento.
 */
export function finishProjection(acc: ProjectionAcc): GameState {
  const { quests, items, temporals, merchant, equipment, attributes, chronicle, xp, gold, completedCount } = acc;
  // Cada quest sabe a qué encargo pendiente pertenece (para su fecha y su enlace).
  // Se recalcula entero: tras desenlazar o cumplir un encargo, la quest ya no lo tiene.
  const owners = questOwners(temporals.board.values());
  for (const q of quests.values()) {
    const temporalId = owners.get(q.id);
    if (temporalId) q.temporalId = temporalId;
    else delete q.temporalId;
  }

  const lv = levelFromXp(xp);
  return {
    quests,
    items: items.catalog,
    temporals: temporals.board,
    gear: fullCatalog(merchant),
    chronicle,
    player: {
      xp,
      gold,
      ...lv,
      rank: rankFor(lv.level),
      maxActive: maxActiveFor(lv.level),
      inventory: items.inventory,
      discovered: items.discovered,
      pity: items.pity,
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

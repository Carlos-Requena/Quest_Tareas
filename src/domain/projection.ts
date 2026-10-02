import type { GameEvent } from "./events";
import type { ConditionDef, GameState, QuestState } from "./types";
import { isPomodoroCondition } from "./types";
import { levelFromXp, maxActiveFor, rankFor } from "./leveling";
import { applyPomodoroEvent, newPomodoro, planOf, viewPomodoro } from "../features/pomodoro/model";
import { upcastQuestDef } from "../features/pomodoro/legacy";
import { applyItemEvent, newItemsAcc, receiveItems, registerItem, type ItemsAcc } from "../features/items/model";
import { upcastReward } from "../features/items/legacy";
import { applyTemporalEvent, linkedQuestDone, newTemporalAcc, questOwners, type TemporalAcc } from "../features/temporal/model";
import { cleanRequires, prerequisitesMet, recurs } from "../features/complex/model";
import { applyMerchantEvent, newMerchantAcc, type MerchantAcc } from "../features/merchant/model";
import { applyEquipmentEvent, newEquipmentAcc, pruneEquipment, type EquipmentAcc } from "../features/equipment/model";
import { gainAttribute, listAttributes, newAttributesAcc, type AttributesAcc } from "../features/attributes/model";

/**
 * Versión de la lógica de la proyección. Un snapshot guardado con otra versión se
 * descarta y se recalcula todo desde los eventos (features/snapshot).
 *
 * NORMA: súbela si cambias el resultado de project() para eventos ya guardados:
 * un `case`, una guarda, un upcaster (legacy.ts) o un apply*Event de una funcionalidad.
 */
export const PROJECTION_VERSION = 2;

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
export function applyEvent(acc: ProjectionAcc, e: GameEvent): void {
  const { quests, items, temporals } = acc;
  // Para los encargos con quests enlazadas: una quest que ya no existe no bloquea.
  const linkDone = (questId: string, since: number) => {
    const q = quests.get(questId);
    return !q || linkedQuestDone(q, since);
  };

  const q = "questId" in e ? quests.get(e.questId) : undefined;

  switch (e.type) {
    case "quest_created":
      if (!quests.has(e.quest.id)) {
        // datos antiguos → formato actual
        const def = upcastQuestDef(e.quest);
        const { reward, item } = upcastReward(def.reward, e.ts);
        if (item) registerItem(items, item);
        quests.set(def.id, {
          ...def,
          requires: cleanRequires(def),
          dueAt: Number.isFinite(def.dueAt) ? def.dueAt : undefined,
          reward,
          status: "available",
          progress: {},
          pomodoros: freshPomodoros(def.conditions),
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
        q.pomodoros = freshPomodoros(q.conditions);
      }
      break;

    case "quest_abandoned":
      if (q?.status === "active") {
        q.status = q.availableAt && q.availableAt > e.ts ? "cooldown" : "available";
        q.progress = {};
        q.acceptedAt = undefined;
        q.pomodoros = freshPomodoros(q.conditions);
      }
      break;

    case "progress_added":
      if (q?.status === "active") {
        const cond = q.conditions.find((c) => c.id === e.conditionId);
        // Las condiciones de pomodoro avanzan con el tiempo, no con +1.
        if (cond && !isPomodoroCondition(cond)) {
          const next = (q.progress[cond.id] ?? 0) + e.amount;
          q.progress = {
            ...q.progress,
            [cond.id]: Math.max(0, Math.min(cond.target, next)),
          };
        }
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
        receiveItems(items, reward.itemId, e.drops ?? [], e.ts);
        // La XP también sube el atributo del área de la quest (features/attributes).
        gainAttribute(acc.attributes, q.area, reward.xp, e.ts);
        acc.completedCount++;
        q.completions++;
        q.lastCompletedAt = e.ts;
        q.progress = {};
        q.acceptedAt = undefined;
        q.pomodoros = freshPomodoros(q.conditions);
        // Las repetibles, y cualquier quest con repetición, vuelven tras su espera.
        if (recurs(q)) {
          q.status = "cooldown";
          q.availableAt = e.ts + (q.cooldownMinutes ?? 0) * 60_000;
        } else {
          q.status = "done";
        }
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
      }
      break;
    }

    case "gear_created":
    case "gear_updated":
    case "gear_deleted":
    case "gear_purchased":
      // Comprar al mercader gasta oro, solo si llega (features/merchant).
      acc.gold -= applyMerchantEvent(acc.merchant, e, e.ts, acc.gold);
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
  const { quests, items, temporals, merchant, equipment, attributes, xp, gold, completedCount } = acc;
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
    gear: merchant.catalog,
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

/** Progreso de una condición en `now`: contador o rondas de pomodoro completadas. */
export function conditionProgress(q: QuestState, c: ConditionDef, now: number): number {
  if (!isPomodoroCondition(c)) return q.progress[c.id] ?? 0;
  const p = q.pomodoros[c.id];
  return p ? viewPomodoro(p, planOf(c), now).completedRounds : 0;
}

/** Las condiciones de contador están cumplidas (las de pomodoro aparte). */
export function countConditionsMet(q: QuestState): boolean {
  return q.conditions.every((c) => isPomodoroCondition(c) || (q.progress[c.id] ?? 0) >= c.target);
}

/** Se puede reportar: todas las condiciones cumplidas, pomodoros incluidos. */
export function conditionsMet(q: QuestState, now: number): boolean {
  return q.conditions.every((c) => conditionProgress(q, c, now) >= c.target);
}

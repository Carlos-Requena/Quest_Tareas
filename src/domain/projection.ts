import type { GameEvent } from "./events";
import type { ConditionDef, GameState, QuestState } from "./types";
import { isPomodoroCondition } from "./types";
import { levelFromXp, maxActiveFor, rankFor } from "./leveling";
import { applyPomodoroEvent, newPomodoro, planOf, viewPomodoro } from "../features/pomodoro/model";
import { upcastQuestDef } from "../features/pomodoro/legacy";
import { applyItemEvent, newItemsAcc, receiveItems, registerItem } from "../features/items/model";
import { upcastReward } from "../features/items/legacy";
import { applyTemporalEvent, linkedQuestDone, newTemporalAcc, questOwners } from "../features/temporal/model";
import { cleanRequires, prerequisitesMet, recurs } from "../features/complex/model";

/** Reproduce los eventos (ya ordenados) y devuelve el estado actual del juego. */
export function project(events: GameEvent[]): GameState {
  const quests = new Map<string, QuestState>();
  const items = newItemsAcc();
  const temporals = newTemporalAcc();
  let xp = 0;
  let gold = 0;
  let completedCount = 0;
  // Para los encargos con quests enlazadas: una quest que ya no existe no bloquea.
  const linkDone = (questId: string, since: number) => {
    const q = quests.get(questId);
    return !q || linkedQuestDone(q, since);
  };

  for (const e of events) {
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
          xp += reward.xp;
          gold += reward.gold;
          receiveItems(items, reward.itemId, e.drops ?? [], e.ts);
          completedCount++;
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
          xp += earned.xp;
          gold += earned.gold;
        }
        break;
      }
    }
  }

  // Cada quest sabe a qué encargo pendiente pertenece (para su fecha y su enlace).
  for (const [questId, temporalId] of questOwners(temporals.board.values())) {
    const q = quests.get(questId);
    if (q) q.temporalId = temporalId;
  }

  const lv = levelFromXp(xp);
  return {
    quests,
    items: items.catalog,
    temporals: temporals.board,
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

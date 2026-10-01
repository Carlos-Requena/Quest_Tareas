import type { GameEvent } from "./events";
import type { GameState, QuestState } from "./types";
import { levelFromXp, maxActiveFor, rankFor } from "./leveling";

/** Reproduce los eventos (ya ordenados) y devuelve el estado actual del juego. */
export function project(events: GameEvent[]): GameState {
  const quests = new Map<string, QuestState>();
  const items: Record<string, number> = {};
  let xp = 0;
  let gold = 0;
  let completedCount = 0;

  for (const e of events) {
    const q = "questId" in e ? quests.get(e.questId) : undefined;

    switch (e.type) {
      case "quest_created":
        if (!quests.has(e.quest.id)) {
          quests.set(e.quest.id, {
            ...e.quest,
            status: "available",
            progress: {},
            completions: 0,
          });
        }
        break;

      case "quest_deleted":
        quests.delete(e.questId);
        break;

      case "quest_accepted":
        if (
          q &&
          (q.status === "available" ||
            (q.status === "cooldown" && e.ts >= (q.availableAt ?? 0)))
        ) {
          q.status = "active";
          q.acceptedAt = e.ts;
          q.progress = {};
        }
        break;

      case "quest_abandoned":
        if (q?.status === "active") {
          q.status = q.availableAt && q.availableAt > e.ts ? "cooldown" : "available";
          q.progress = {};
          q.acceptedAt = undefined;
        }
        break;

      case "progress_added":
        if (q?.status === "active") {
          const cond = q.conditions.find((c) => c.id === e.conditionId);
          if (cond) {
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
          xp += e.reward.xp;
          gold += e.reward.gold;
          if (e.reward.item) items[e.reward.item] = (items[e.reward.item] ?? 0) + 1;
          completedCount++;
          q.completions++;
          q.progress = {};
          q.acceptedAt = undefined;
          if (q.category === "repeat") {
            q.status = "cooldown";
            q.availableAt = e.ts + (q.cooldownMinutes ?? 0) * 60_000;
          } else {
            q.status = "done";
          }
        }
        break;
    }
  }

  const lv = levelFromXp(xp);
  return {
    quests,
    player: {
      xp,
      gold,
      ...lv,
      rank: rankFor(lv.level),
      maxActive: maxActiveFor(lv.level),
      items,
      completedCount,
    },
  };
}

/** El estado "cooldown" caduca con el paso del tiempo, sin necesidad de eventos. */
export function effectiveStatus(q: QuestState, now: number) {
  if (q.status === "cooldown" && now >= (q.availableAt ?? 0)) return "available";
  return q.status;
}

export function conditionsMet(q: QuestState): boolean {
  return q.conditions.every((c) => (q.progress[c.id] ?? 0) >= c.target);
}

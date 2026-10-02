import { useGame } from "./game";
import { conditionsMet, effectiveStatus } from "../domain/projection";
import { isPomodoroCondition } from "../domain/types";
import { sfx } from "../lib/sfx";
import i18n from "../i18n";
import { dropTableFor, rollDrops } from "../features/items/model";
import { blockers, unlockedBetween } from "../features/complex/model";
import { pendingLinks } from "../features/temporal/model";

function activeCount() {
  return [...useGame.getState().state.quests.values()].filter((q) => q.status === "active").length;
}

export async function acceptQuest(id: string) {
  const { state, dispatch, say } = useGame.getState();
  const q = state.quests.get(id);
  if (!q || effectiveStatus(q, Date.now()) !== "available") return;
  // Quest con requisitos sin completar (features/complex): la proyección también lo impide.
  const lock = blockers(q, state.quests);
  if (lock.length) {
    sfx.cancel();
    say(() => i18n.t("complex.toast.locked", { title: lock[0].title }));
    return;
  }
  if (activeCount() >= state.player.maxActive) {
    sfx.cancel();
    say(() => i18n.t("toast.noSlots"));
    return;
  }
  await dispatch({ type: "quest_accepted", questId: id });
  say(() => i18n.t("toast.accepted", { title: q.title }));
}

export async function abandonQuest(id: string) {
  const { state, dispatch, say } = useGame.getState();
  const q = state.quests.get(id);
  if (q?.status !== "active") return;
  sfx.cancel();
  await dispatch({ type: "quest_abandoned", questId: id });
  say(() => i18n.t("toast.abandoned", { title: q.title }));
}

export async function addProgress(id: string, conditionId: string, amount: number) {
  const { state, dispatch } = useGame.getState();
  const q = state.quests.get(id);
  const c = q?.conditions.find((c) => c.id === conditionId);
  if (!q || !c || isPomodoroCondition(c) || q.status !== "active") return;
  const cur = q.progress[c.id] ?? 0;
  if (cur + amount < 0 || cur + amount > c.target) return;
  sfx.tick();
  await dispatch({ type: "progress_added", questId: id, conditionId, amount });
}

/** Suma 1 al primer objetivo incompleto (atajo de teclado). */
export async function bumpNext(id: string) {
  const q = useGame.getState().state.quests.get(id);
  const c = q?.conditions.find((c) => !isPomodoroCondition(c) && (q.progress[c.id] ?? 0) < c.target);
  if (q && c) await addProgress(id, c.id, 1);
}

export async function reportQuest(id: string) {
  const { state, dispatch, setClear, say } = useGame.getState();
  const q = state.quests.get(id);
  if (q?.status !== "active" || !conditionsMet(q, Date.now())) return;
  const before = state.player;
  // El azar se resuelve aquí y el resultado viaja en el evento: la proyección es determinista.
  const drops = rollDrops(dropTableFor(q.category), state.items.values(), before.pity, Math.random);
  const itemId = q.reward.itemId;
  const guaranteed = itemId && state.items.has(itemId) ? itemId : undefined;
  await dispatch({ type: "quest_completed", questId: id, reward: q.reward, drops });
  const after = useGame.getState().state;
  setClear({ questId: id, before, after: after.player, guaranteed, drops });
  say(() => i18n.t("toast.completed", { title: q.title }));

  // ¿Abre algo? Una quest que la tenía de requisito, o su encargo temporal, que ya se puede cumplir.
  const next = unlockedBetween(state.quests, after.quests)[0];
  const event = q.temporalId ? after.temporals.get(q.temporalId) : undefined;
  if (next) say(() => i18n.t("complex.toast.unlocked", { title: q.title, next: next.title }));
  else if (event?.status === "pending" && pendingLinks(event, after.quests).length === 0)
    say(() => i18n.t("temporal.toast.questsReady", { title: q.title, event: event.title }));
}

/** Acción principal (Enter / A): aceptar o reportar según el estado. */
export async function primaryAction(id: string) {
  const q = useGame.getState().state.quests.get(id);
  if (!q) return;
  if (q.status === "active") await reportQuest(id);
  else await acceptQuest(id);
}

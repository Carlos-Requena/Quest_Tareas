import { useGame } from "./game";
import { conditionsMet, effectiveStatus } from "../domain/projection";
import { sfx } from "../lib/sfx";

function activeCount() {
  return [...useGame.getState().state.quests.values()].filter((q) => q.status === "active").length;
}

export async function acceptQuest(id: string) {
  const { state, dispatch, say } = useGame.getState();
  const q = state.quests.get(id);
  if (!q || effectiveStatus(q, Date.now()) !== "available") return;
  if (activeCount() >= state.player.maxActive) {
    sfx.cancel();
    say("No quedan huecos libres: completa o abandona otra quest");
    return;
  }
  await dispatch({ type: "quest_accepted", questId: id });
  say(`«${q.title}» aceptada`);
}

export async function abandonQuest(id: string) {
  const { state, dispatch, say } = useGame.getState();
  const q = state.quests.get(id);
  if (q?.status !== "active") return;
  sfx.cancel();
  await dispatch({ type: "quest_abandoned", questId: id });
  say(`Has abandonado «${q.title}»`);
}

export async function addProgress(id: string, conditionId: string, amount: number) {
  const { state, dispatch } = useGame.getState();
  const q = state.quests.get(id);
  const c = q?.conditions.find((c) => c.id === conditionId);
  if (!q || !c || q.status !== "active") return;
  const cur = q.progress[c.id] ?? 0;
  if (cur + amount < 0 || cur + amount > c.target) return;
  sfx.tick();
  await dispatch({ type: "progress_added", questId: id, conditionId, amount });
}

/** Suma 1 al primer objetivo incompleto (atajo de teclado). */
export async function bumpNext(id: string) {
  const q = useGame.getState().state.quests.get(id);
  const c = q?.conditions.find((c) => (q.progress[c.id] ?? 0) < c.target);
  if (q && c) await addProgress(id, c.id, 1);
}

export async function reportQuest(id: string) {
  const { state, dispatch, setClear, say } = useGame.getState();
  const q = state.quests.get(id);
  if (q?.status !== "active" || !conditionsMet(q)) return;
  const before = state.player;
  await dispatch({ type: "quest_completed", questId: id, reward: q.reward });
  setClear({ questId: id, before, after: useGame.getState().state.player });
  say(`«${q.title}» completada`);
}

/** Acción principal (Enter / A): aceptar o reportar según el estado. */
export async function primaryAction(id: string) {
  const q = useGame.getState().state.quests.get(id);
  if (!q) return;
  if (q.status === "active") await reportQuest(id);
  else await acceptQuest(id);
}

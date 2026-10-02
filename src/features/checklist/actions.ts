import { useGame } from "../../store/game";
import { sfx } from "../../lib/sfx";
import { isChecked, isChecklistCondition, nextUnchecked } from "./model";

/** Marca o desmarca una casilla de una lista (solo con la quest en curso). */
export async function toggleCheck(questId: string, conditionId: string, itemId: string) {
  const { state, dispatch } = useGame.getState();
  const q = state.quests.get(questId);
  const c = q?.conditions.find((c) => c.id === conditionId);
  if (!q || q.status !== "active" || !c || !isChecklistCondition(c) || !c.items.some((it) => it.id === itemId)) return;
  const done = !isChecked(q.checked, c.id, itemId);
  if (done) sfx.tick();
  else sfx.cancel();
  await dispatch({ type: "checklist_checked", questId, conditionId, itemId, done });
}

/** Marca la primera casilla sin marcar de una lista (atajo `+`). Devuelve si había alguna. */
export async function checkNext(questId: string, conditionId: string): Promise<boolean> {
  const q = useGame.getState().state.quests.get(questId);
  const c = q?.conditions.find((c) => c.id === conditionId);
  if (!q || !c || !isChecklistCondition(c)) return false;
  const it = nextUnchecked(q.checked, c);
  if (!it) return false;
  await toggleCheck(questId, conditionId, it.id);
  return true;
}

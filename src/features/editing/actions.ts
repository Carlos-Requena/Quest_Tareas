// Casos de uso de la edición: abrir el formulario y guardar los cambios como un parche.

import { useGame } from "../../store/game";
import type { QuestDef } from "../../domain/types";
import { sfx } from "../../lib/sfx";
import i18n from "../../i18n";
import { offerUndo } from "../undo/actions";
import { diffQuest, isEditable, STRUCTURAL_KEYS } from "./model";
import { useEditingUi } from "./ui";

/** Abre el formulario para editar la quest (tecla R o el botón del detalle). */
export function openEdit(questId: string) {
  const q = useGame.getState().state.quests.get(questId);
  if (!q) return;
  if (!isEditable(q)) {
    sfx.cancel();
    useGame.getState().say(() => i18n.t("editing.toast.finished", { title: q.title }));
    return;
  }
  sfx.unfold();
  useEditingUi.getState().setEditing(questId);
}

/**
 * Guarda lo que cambió en el formulario. Solo emite `quest_updated` si algo cambia, y con
 * la quest en curso deja fuera los objetivos, la categoría y la repetición (la proyección
 * también los ignora). Se puede deshacer unos minutos (features/undo).
 */
export async function saveQuestEdit(id: string, next: QuestDef): Promise<boolean> {
  const { state, dispatch, say } = useGame.getState();
  const q = state.quests.get(id);
  if (!q || !isEditable(q)) return false;
  const patch = diffQuest(q, next);
  if (patch && q.status === "active") for (const k of STRUCTURAL_KEYS) delete patch[k];
  if (!patch || !Object.keys(patch).length) {
    say(() => i18n.t("editing.toast.unchanged"));
    return true;
  }
  const e = await dispatch({ type: "quest_updated", questId: id, patch });
  sfx.tick();
  offerUndo(e, () => i18n.t("editing.toast.saved", { title: next.title }));
  return true;
}

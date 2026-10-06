import { AnimatePresence } from "motion/react";
import { useGame } from "../../../store/game";
import { QuestFormModal } from "../../../components/CreateQuestModal";
import { useEditingUi } from "../ui";

/** El formulario de quest en modo edición, encima de todo (se monta en App). */
export function EditQuestModal() {
  const id = useEditingUi((s) => s.editing);
  const quest = useGame((s) => (id ? s.state.quests.get(id) : undefined));
  const close = () => useEditingUi.getState().setEditing(undefined);
  // Si la quest deja de existir o termina mientras está abierto, se cierra solo.
  const open = !!quest && quest.status !== "done";
  return <AnimatePresence>{open && <QuestFormModal key={quest.id} edit={quest} onClose={close} />}</AnimatePresence>;
}

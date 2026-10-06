// Estado de interfaz de la edición: qué quest se está editando, o con qué datos empieza
// una quest nueva (el alta rápida o una copia de una fallida). No genera eventos.

import { create } from "zustand";
import type { QuestDef } from "../../domain/types";

interface EditingUi {
  /** Quest abierta en el formulario de edición. */
  editing?: string;
  /** Quest nueva con datos de partida: el formulario completo sale ya relleno. */
  draft?: Partial<QuestDef>;
  setEditing(id?: string): void;
  setDraft(d?: Partial<QuestDef>): void;
}

export const useEditingUi = create<EditingUi>((set) => ({
  setEditing: (editing) => set({ editing }),
  setDraft: (draft) => set({ draft }),
}));

/** Hay un formulario de edición abierto: el teclado del tablón espera. */
export const editingBusy = () => {
  const s = useEditingUi.getState();
  return !!(s.editing || s.draft);
};

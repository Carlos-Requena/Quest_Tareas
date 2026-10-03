// Estado de interfaz de la agenda: qué bloque se está creando o editando. No genera eventos.

import { create } from "zustand";

export type AgendaForm =
  /** Nuevo bloque, con el día (y la hora, si se pulsó en la rejilla) ya puestos. */
  | { mode: "create"; date: string; start?: number }
  /** Editar uno; `date` es el día desde el que se abrió (para «quitar solo este día»). */
  | { mode: "edit"; id: string; date: string };

interface AgendaUi {
  form?: AgendaForm;
  setForm(form?: AgendaForm): void;
}

export const useAgendaUi = create<AgendaUi>((set) => ({
  setForm: (form) => set({ form }),
}));

/** Hay una ventana de la agenda abierta: los teclados de los tablones esperan. */
export const agendaBusy = () => !!useAgendaUi.getState().form;

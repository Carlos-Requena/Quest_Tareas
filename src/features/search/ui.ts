// Estado de interfaz de la búsqueda: si la ventana está abierta. No genera eventos.

import { create } from "zustand";

interface SearchUi {
  open: boolean;
  setOpen(open: boolean): void;
}

export const useSearchUi = create<SearchUi>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

export const searchBusy = () => useSearchUi.getState().open;

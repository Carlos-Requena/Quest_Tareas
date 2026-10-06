// Estado de interfaz del alta rápida: pedir el foco de la barra (tecla N) y la hoja del
// teléfono. No genera eventos.

import { create } from "zustand";

interface QuickUi {
  /** Cambia cada vez que se pide el foco: la barra lo vigila. */
  focusKey: number;
  /** Hoja de abajo del teléfono abierta. */
  sheet: boolean;
  focus(): void;
  setSheet(open: boolean): void;
}

export const useQuickUi = create<QuickUi>((set) => ({
  focusKey: 0,
  sheet: false,
  focus: () => set({ focusKey: Date.now() }),
  setSheet: (sheet) => set({ sheet }),
}));

export const quickBusy = () => useQuickUi.getState().sheet;

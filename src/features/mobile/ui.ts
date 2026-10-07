// Estado de interfaz del teléfono: si el detalle de la quest está abierto a pantalla completa.
// Es estado de UI: no genera eventos ni se guarda. El menú de opciones está en features/menu.

import { create } from "zustand";

interface MobileUi {
  /**
   * Quest cuyo detalle está abierto a pantalla completa (en el escritorio siempre se ve al lado).
   * Se guarda el id, no un sí o no: si esa quest deja el tablón (completada, retirada, otra
   * pestaña), App cierra el detalle en lugar de enseñar otra quest.
   */
  detail?: string;
  openDetail(questId: string): void;
  closeDetail(): void;
}

export const useMobileUi = create<MobileUi>((set) => ({
  openDetail: (detail) => set({ detail }),
  closeDetail: () => set({ detail: undefined }),
}));

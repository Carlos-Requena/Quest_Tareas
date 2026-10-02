// Estado de interfaz del teléfono: si el detalle de la quest está abierto a pantalla completa
// y si está desplegado el menú «Más». Es estado de UI: no genera eventos ni se guarda.

import { create } from "zustand";

interface MobileUi {
  /**
   * Quest cuyo detalle está abierto a pantalla completa (en el escritorio siempre se ve al lado).
   * Se guarda el id, no un sí o no: si esa quest deja el tablón (completada, retirada, otra
   * pestaña), App cierra el detalle en lugar de enseñar otra quest.
   */
  detail?: string;
  /** Menú «Más»: objetos, crónica, idioma, música, sonido y Google Drive. */
  menu: boolean;
  openDetail(questId: string): void;
  closeDetail(): void;
  setMenu(open: boolean): void;
}

export const useMobileUi = create<MobileUi>((set) => ({
  menu: false,
  openDetail: (detail) => set({ detail, menu: false }),
  closeDetail: () => set({ detail: undefined }),
  setMenu: (menu) => set({ menu }),
}));

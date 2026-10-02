// Estado de interfaz de la ventana del mercader. No es estado de juego: no genera
// eventos ni se guarda (igual que features/temporal/ui.ts).

import { create } from "zustand";

export type MerchantTab = "showcase" | "catalog";

interface MerchantUi {
  open: boolean;
  tab: MerchantTab;
  setOpen(open: boolean, tab?: MerchantTab): void;
  setTab(tab: MerchantTab): void;
}

export const useMerchantUi = create<MerchantUi>((set) => ({
  open: false,
  tab: "showcase",
  setOpen: (open, tab) => set(tab ? { open, tab } : { open }),
  setTab: (tab) => set({ tab }),
}));

export const openMerchant = (tab?: MerchantTab) => useMerchantUi.getState().setOpen(true, tab);

/** La ventana del mercader está abierta: el teclado del tablón espera. */
export const merchantBusy = () => useMerchantUi.getState().open;

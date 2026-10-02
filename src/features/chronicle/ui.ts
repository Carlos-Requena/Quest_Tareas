// Estado de interfaz de la crónica: si está abierta. No es estado de juego: no genera
// eventos ni se guarda (igual que features/equipment/ui.ts).

import { create } from "zustand";

interface ChronicleUi {
  open: boolean;
  setOpen(open: boolean): void;
}

export const useChronicleUi = create<ChronicleUi>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

export const openChronicle = () => useChronicleUi.setState({ open: true });

/** La crónica está abierta: el teclado del tablón espera. */
export const chronicleBusy = () => useChronicleUi.getState().open;

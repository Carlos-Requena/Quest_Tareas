// Estado de interfaz de la ventana del personaje. No es estado de juego: no genera
// eventos ni se guarda (igual que features/temporal/ui.ts).

import { create } from "zustand";
import type { GearSlot } from "../merchant/model";

interface CharacterUi {
  open: boolean;
  /** Ranura elegida: el panel derecho muestra el armario de esa ranura en vez de los atributos. */
  slot?: GearSlot;
  setOpen(open: boolean): void;
  pick(slot?: GearSlot): void;
}

export const useCharacterUi = create<CharacterUi>((set) => ({
  open: false,
  setOpen: (open) => set(open ? { open } : { open, slot: undefined }),
  pick: (slot) => set({ slot }),
}));

export const openCharacter = (slot?: GearSlot) => useCharacterUi.setState({ open: true, slot });

/** La ventana del personaje está abierta: el teclado del tablón espera. */
export const characterBusy = () => useCharacterUi.getState().open;

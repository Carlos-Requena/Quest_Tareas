// Estado de interfaz del menú de opciones: si está abierto, si está abierto el selector de
// personajes y el personaje elegido a mano para hoy. No es estado de juego: no genera eventos.
// Lo elegido para hoy se guarda en este equipo (como el idioma) y caduca solo a medianoche.

import { create } from "zustand";
import type { CharacterPick } from "./model";

const PICK_KEY = "quests.menuCharacter";

function readPick(): CharacterPick | undefined {
  try {
    const raw = JSON.parse(localStorage.getItem(PICK_KEY) ?? "null");
    return raw && typeof raw.day === "number" && typeof raw.id === "string" ? { day: raw.day, id: raw.id } : undefined;
  } catch {
    return undefined;
  }
}

function writePick(pick: CharacterPick | undefined) {
  try {
    if (pick) localStorage.setItem(PICK_KEY, JSON.stringify(pick));
    else localStorage.removeItem(PICK_KEY);
  } catch {
    // Sin almacenamiento (ventana privada): vale para esta sesión.
  }
}

interface MenuUi {
  open: boolean;
  /** El selector de personajes, encima del menú. */
  cast: boolean;
  /** Personaje elegido a mano para un día (en este equipo). La rotación sigue igual. */
  pick?: CharacterPick;
  setOpen(open: boolean): void;
  setCast(cast: boolean): void;
  setPick(pick?: CharacterPick): void;
}

export const useMenuUi = create<MenuUi>((set) => ({
  open: false,
  cast: false,
  pick: readPick(),
  setOpen: (open) => set(open ? { open } : { open, cast: false }),
  setCast: (cast) => set({ cast }),
  setPick: (pick) => {
    writePick(pick);
    set({ pick });
  },
}));

/** El menú está abierto: el teclado del tablón espera (el menú tiene el suyo). */
export const menuBusy = () => useMenuUi.getState().open;

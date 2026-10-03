// Plazo elegido en cada tablón. Es estado de interfaz: no genera eventos ni se guarda.

import { create } from "zustand";
import type { Section } from "../../store/game";
import { filtersFor, type HorizonFilter } from "./model";

/** Los tablones con filtro de plazo (el calendario ya ordena por días). */
export type HorizonSection = Exclude<Section, "calendar">;

interface HorizonUi {
  filter: Record<HorizonSection, HorizonFilter>;
  setFilter(section: HorizonSection, f: HorizonFilter): void;
}

export const useHorizonUi = create<HorizonUi>((set) => ({
  filter: { board: "all", temporal: "all" },
  setFilter: (section, f) => set((s) => ({ filter: { ...s.filter, [section]: f } })),
}));

/** Opciones de cada tablón: «sin fecha» solo en el de quests (los encargos siempre tienen fecha). */
export const filtersOf = (section: HorizonSection) => filtersFor(section === "board");

/** Pasa al plazo siguiente (o al anterior) del tablón: tecla H. */
export function cycleHorizon(section: HorizonSection, step: 1 | -1) {
  const opts = filtersOf(section);
  const { filter, setFilter } = useHorizonUi.getState();
  const i = opts.indexOf(filter[section]);
  setFilter(section, opts[(i + step + opts.length) % opts.length]);
}

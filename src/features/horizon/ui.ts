// Plazo elegido en cada tablón. Es estado de interfaz: no genera eventos ni se guarda.

import { create } from "zustand";
import type { Section } from "../../store/game";
import { filtersFor, type HorizonFilter } from "./model";

interface HorizonUi {
  filter: Record<Section, HorizonFilter>;
  setFilter(section: Section, f: HorizonFilter): void;
}

export const useHorizonUi = create<HorizonUi>((set) => ({
  filter: { board: "all", temporal: "all" },
  setFilter: (section, f) => set((s) => ({ filter: { ...s.filter, [section]: f } })),
}));

/** Opciones de cada tablón: «sin fecha» solo en el de quests (los encargos siempre tienen fecha). */
export const filtersOf = (section: Section) => filtersFor(section === "board");

/** Pasa al plazo siguiente (o al anterior) del tablón: tecla H. */
export function cycleHorizon(section: Section, step: 1 | -1) {
  const opts = filtersOf(section);
  const { filter, setFilter } = useHorizonUi.getState();
  const i = opts.indexOf(filter[section]);
  setFilter(section, opts[(i + step + opts.length) % opts.length]);
}

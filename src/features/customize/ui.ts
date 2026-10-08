// Estado de interfaz de la ventana de personalización: si está abierta, qué pestaña, qué
// personaje se está editando, qué parte del día y qué tipo de encargo se ven. No es estado
// de juego: no genera eventos ni se guarda.

import { create } from "zustand";
import { daypart, type Daypart } from "../menu/model";
import type { TemporalKind } from "../temporal/model";
import type { Situation } from "../companion/model";

export type CustomizeTab = "cast" | "bounties";
/** Qué se edita de un personaje: lo que dice en el menú, lo que dice en «Mi día» o cómo se mueve. */
export type CharacterPane = "voice" | "today" | "motion";

interface CustomizeUi {
  open: boolean;
  tab: CustomizeTab;
  /** Personaje cuyas frases se editan (pestaña de personajes); sin él, la rejilla. */
  character?: string;
  /** Qué se edita del personaje elegido. */
  pane: CharacterPane;
  /** Parte del día que se ve en el editor de frases. */
  part: Daypart;
  /** Situación de «Mi día» que se ve en las frases del compañero. */
  situation: Situation;
  /** Cuántas veces se ha pedido ver la entrada en la vista previa (cambiarlo la repite). */
  replay: number;
  /** Tipo de encargo que se ve en la pestaña de ilustraciones. */
  kind: TemporalKind;
  /** Ilustración de la vista previa; sin ella, la primera del tipo. */
  art?: string;
  set(patch: Partial<Omit<CustomizeUi, "set">>): void;
}

export const useCustomizeUi = create<CustomizeUi>((set) => ({
  open: false,
  tab: "cast",
  pane: "voice",
  part: "morning",
  situation: "tonight",
  replay: 0,
  kind: "summons",
  set: (patch) => set(patch),
}));

/** Abre la ventana (desde su tarjeta del menú de opciones), en la rejilla y con la parte del día de ahora. */
export function openCustomize(tab?: CustomizeTab) {
  useCustomizeUi.getState().set({ open: true, character: undefined, replay: 0, part: daypart(new Date().getHours()), ...(tab ? { tab } : {}) });
}

export const closeCustomize = () => useCustomizeUi.getState().set({ open: false });

/** La ventana está abierta: el teclado del tablón y el del menú esperan. */
export const customizeBusy = () => useCustomizeUi.getState().open;

// Estado de interfaz propio del tablón de encargos temporales (qué cartel está
// elegido, qué ventana o animación está abierta). Es estado de UI, no de juego:
// no genera eventos ni se guarda. Vive aquí y no en store/game.ts para que la
// funcionalidad no engorde el store común (el informe técnico recomienda separar
// el estado de UI por funcionalidad).

import { create } from "zustand";
import type { PlayerState } from "../../domain/types";
import type { AttachmentRef, TemporalReward } from "./model";

/** Lo que necesita la animación de «encargo cumplido». */
export interface TemporalClear {
  temporalId: string;
  before: PlayerState;
  after: PlayerState;
  reward: TemporalReward;
}

export type TemporalForm = { mode: "create" } | { mode: "edit"; id: string };

/** Rectángulo de pantalla desde el que se abre un cartel (para que «salga» del tablón). */
export interface Origin {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface TemporalUi {
  selectedId?: string;
  /** Cartel abierto en grande. */
  viewing?: { id: string; origin?: Origin };
  form?: TemporalForm;
  /** Animación de «cartel clavado» en curso (id del encargo recién creado). */
  posted?: string;
  /** Animación de «encargo cumplido» en curso. */
  cleared?: TemporalClear;
  /** Visor de un adjunto. */
  viewer?: AttachmentRef;
  /** Mostrar también los cumplidos en el tablón. */
  showDone: boolean;
  /** Cartel que acaba de llegar al tablón: cae y se clava con su chincheta. */
  landed?: { id: string; key: number };
  /** Cartel recién cumplido: recibe el sello «CLEAR» y se descuelga del tablón. */
  farewell?: { id: string; key: number };

  select(id?: string): void;
  open(id: string, origin?: Origin): void;
  closeView(): void;
  setForm(form?: TemporalForm): void;
  setPosted(id?: string): void;
  setCleared(c?: TemporalClear): void;
  setViewer(a?: AttachmentRef): void;
  setShowDone(v: boolean): void;
  land(id: string): void;
  bid(id?: string): void;
}

export const useTemporalUi = create<TemporalUi>((set) => ({
  showDone: false,
  select: (selectedId) => set({ selectedId }),
  open: (id, origin) => set({ viewing: { id, origin }, selectedId: id }),
  closeView: () => set({ viewing: undefined }),
  setForm: (form) => set({ form }),
  setPosted: (posted) => set({ posted }),
  setCleared: (cleared) => set({ cleared }),
  setViewer: (viewer) => set({ viewer }),
  setShowDone: (showDone) => set({ showDone }),
  land: (id) => set({ landed: { id, key: Date.now() }, selectedId: id }),
  bid: (id) => set({ farewell: id ? { id, key: Date.now() } : undefined }),
}));

/** Hay una ventana o animación de los encargos abierta: el teclado del tablón espera. */
export function temporalBusy(): boolean {
  const s = useTemporalUi.getState();
  return !!(s.viewing || s.form || s.posted || s.cleared || s.viewer);
}

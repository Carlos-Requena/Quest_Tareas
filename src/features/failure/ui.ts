// Estado de interfaz de los fallos: la cola de animaciones (fracturas y carteles que se
// queman) y hasta cuándo se han visto en este equipo. No genera eventos.

import { create } from "zustand";

/** Hasta cuándo se han enseñado los fallos en este equipo (ms). Es de cada equipo, como el idioma. */
const SEEN_KEY = "quests.failSeen";

export interface FailureShow {
  kind: "quest" | "temporal";
  id: string;
}

function loadSeen(): number | undefined {
  try {
    const v = Number(localStorage.getItem(SEEN_KEY));
    return Number.isFinite(v) && v > 0 ? v : undefined;
  } catch {
    return undefined;
  }
}

interface FailureUi {
  /** Lo que falta por enseñar, en orden. */
  queue: FailureShow[];
  /** Último fallo enseñado (o el arranque de la primera vez): lo anterior no se repite. */
  seen?: number;
  enqueue(items: FailureShow[], seen: number): void;
  next(): void;
}

export const useFailureUi = create<FailureUi>((set, get) => ({
  queue: [],
  seen: loadSeen(),
  enqueue: (items, at) => {
    // La marca nunca retrocede: lo ya enseñado no se repite.
    const seen = Math.max(get().seen ?? 0, at);
    try {
      localStorage.setItem(SEEN_KEY, String(seen));
    } catch {
      // Sin almacenamiento (modo privado): se recuerda solo en esta sesión.
    }
    const have = new Set(get().queue.map((x) => `${x.kind}:${x.id}`));
    set({ queue: [...get().queue, ...items.filter((x) => !have.has(`${x.kind}:${x.id}`))], seen });
  },
  next: () => set({ queue: get().queue.slice(1) }),
}));

/** Hay una animación de fallo en pantalla: el teclado espera. */
export const failureBusy = () => useFailureUi.getState().queue.length > 0;

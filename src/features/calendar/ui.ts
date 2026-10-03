// Estado de interfaz del calendario: vista (semana o día), día elegido y la quest que se
// está creando desde un día. No genera eventos.

import { create } from "zustand";
import { dateKey } from "../agenda/model";
import { agendaBusy } from "../agenda/ui";

export type CalendarView = "week" | "day";

/** La vista se recuerda en cada equipo (como el idioma): no es un dato del juego. */
const VIEW_KEY = "quests.calendarView";

function loadView(): CalendarView {
  try {
    return localStorage.getItem(VIEW_KEY) === "day" ? "day" : "week";
  } catch {
    return "week";
  }
}

interface CalendarUi {
  view: CalendarView;
  /** Día elegido (AAAA-MM-DD): la semana que se ve es la suya. */
  day: string;
  /** Día para el que se está creando una quest (su fecha límite). */
  questFor?: string;
  /** Día con el menú «Añadir» abierto. */
  adding?: string;
  setView(v: CalendarView): void;
  setDay(day: string): void;
  setQuestFor(day?: string): void;
  setAdding(day?: string): void;
}

export const useCalendarUi = create<CalendarUi>((set) => ({
  view: loadView(),
  day: dateKey(Date.now()),
  setView: (view) => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      // Sin almacenamiento (modo privado): solo dura esta sesión.
    }
    set({ view });
  },
  setDay: (day) => set({ day }),
  setQuestFor: (questFor) => set({ questFor, adding: undefined }),
  setAdding: (adding) => set({ adding }),
}));

/** Hay una ventana abierta desde el calendario (agenda o quest): el teclado espera. */
export function calendarBusy(): boolean {
  return agendaBusy() || !!useCalendarUi.getState().questFor;
}

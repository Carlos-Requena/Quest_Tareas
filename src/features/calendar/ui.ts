// Estado de interfaz del calendario: vista (semana o día), día elegido y la quest que se
// está creando desde un día. No genera eventos.

import { create } from "zustand";
import { dateKey } from "../agenda/model";
import { agendaBusy } from "../agenda/ui";

/** «Mi día» (features/today), la semana o el día por horas. */
export type CalendarView = "today" | "week" | "day";
export const CALENDAR_VIEWS: readonly CalendarView[] = ["today", "week", "day"];

/** La vista se recuerda en cada equipo (como el idioma): no es un dato del juego. */
const VIEW_KEY = "quests.calendarView";

/** La primera vez, «Mi día»: el calendario es donde se planifica (features/today). */
function loadView(): CalendarView {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    return CALENDAR_VIEWS.find((x) => x === v) ?? "today";
  } catch {
    return "today";
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

// Casos de uso del calendario: navegar, abrir lo que sale en un día y añadir cosas a un día.
// No generan eventos propios: lo que se crea va por la agenda, las quests o los encargos.

import { useGame } from "../../store/game";
import { sfx } from "../../lib/sfx";
import { addDays, dateKey } from "../agenda/model";
import { useAgendaUi } from "../agenda/ui";
import { goToQuest, goToTemporal } from "../temporal/actions";
import { useTemporalUi } from "../temporal/ui";
import type { CalendarItem } from "./model";
import { CALENDAR_VIEWS, useCalendarUi, type CalendarView } from "./ui";

/** Abre el calendario (tecla S o el selector de la cabecera); desde él, vuelve al Quest Board. */
export function toggleCalendar() {
  const g = useGame.getState();
  sfx.page();
  g.setSection(g.section === "calendar" ? "board" : "calendar");
}

/** Semana o día anterior / siguiente. Desde «Mi día», al día de antes o de después, por horas. */
export function moveCalendar(step: 1 | -1) {
  const ui = useCalendarUi.getState();
  sfx.move();
  ui.setAdding(undefined);
  if (ui.view === "today") {
    ui.setDay(addDays(dateKey(Date.now()), step));
    ui.setView("day");
    return;
  }
  ui.setDay(addDays(ui.day, ui.view === "week" ? 7 * step : step));
}

/** Tecla V: Mi día → semana → día → Mi día. */
export function cycleCalendarView() {
  const { view } = useCalendarUi.getState();
  setCalendarView(CALENDAR_VIEWS[(CALENDAR_VIEWS.indexOf(view) + 1) % CALENDAR_VIEWS.length]);
}

export function goToday() {
  sfx.move();
  useCalendarUi.getState().setDay(dateKey(Date.now()));
}

export function setCalendarView(view: CalendarView, day?: string) {
  const ui = useCalendarUi.getState();
  if (day) ui.setDay(day);
  if (view === ui.view) return;
  sfx.page();
  ui.setAdding(undefined);
  ui.setView(view);
}

/** Abre lo que sale en un día: el bloque en su formulario, el encargo en su cartel, la quest en el tablón. */
export function openCalendarItem(item: CalendarItem, date: string) {
  if (item.kind === "agenda") {
    sfx.unfold();
    useAgendaUi.getState().setForm({ mode: "edit", id: item.id, date });
  } else if (item.kind === "temporal") goToTemporal(item.id);
  else goToQuest(item.id);
}

/** Bloque nuevo en la agenda ese día (a la hora pulsada en la rejilla, si la hay). */
export function addBlock(date: string, start?: number) {
  sfx.move();
  useCalendarUi.getState().setAdding(undefined);
  useAgendaUi.getState().setForm({ mode: "create", date, start });
}

/** Quest con fecha límite ese día (el formulario completo del Quest Board). */
export function addQuest(date: string) {
  sfx.move();
  useCalendarUi.getState().setQuestFor(date);
}

/** Encargo ese día (a las 10:00, como siempre). */
export function addTemporal(date: string) {
  sfx.move();
  useCalendarUi.getState().setAdding(undefined);
  useTemporalUi.getState().setForm({ mode: "create", date });
}

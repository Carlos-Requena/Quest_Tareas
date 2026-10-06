// Casos de uso de la agenda: validan el formulario y llaman a dispatch.

import { useGame } from "../../store/game";
import { uid } from "../../lib/id";
import { sfx } from "../../lib/sfx";
import i18n from "../../i18n";
import { AGENDA_COLORS, AGENDA_LIMITS, formatClock, isDateKey, normalizeAgenda, parseClock, weekday, type AgendaColor, type AgendaDef, type AgendaPatch, type AgendaState } from "./model";
import { useAgendaUi } from "./ui";
import { offerUndo } from "../undo/actions";

/** Lo que rellena el formulario de un bloque. */
export interface AgendaDraft {
  title: string;
  /** AAAA-MM-DD. */
  date: string;
  /** HH:MM. */
  start: string;
  end: string;
  repeat: "none" | "daily" | "days";
  /** Días elegidos (0 = domingo … 6 = sábado) con «Días de la semana». */
  days: number[];
  /** AAAA-MM-DD o vacío (sin fin). */
  until: string;
  color: AgendaColor;
  notes: string;
}

/** Bloque nuevo: el día elegido, a la hora pulsada (o a las 9:00), una hora. */
export function emptyAgendaDraft(date: string, start = 9 * 60): AgendaDraft {
  const s = Math.max(0, Math.min(23 * 60, start));
  return { title: "", date, start: formatClock(s), end: formatClock(Math.min(1440, s + 60)), repeat: "none", days: [weekday(date)], until: "", color: "gold", notes: "" };
}

export function agendaDraftOf(e: AgendaState): AgendaDraft {
  const r = e.repeat;
  return {
    title: e.title,
    date: e.date,
    start: formatClock(e.start),
    end: formatClock(e.end),
    repeat: !r ? "none" : r.days.length === 7 ? "daily" : "days",
    days: r?.days ?? [weekday(e.date)],
    until: r?.until ?? "",
    color: e.color,
    notes: e.notes,
  };
}

/** Por qué no se puede guardar (o undefined si se puede). */
export function agendaDraftError(d: AgendaDraft): "title" | "date" | "time" | undefined {
  if (!d.title.trim()) return "title";
  if (!isDateKey(d.date)) return "date";
  const s = parseClock(d.start);
  const e = parseClock(d.end);
  if (!Number.isFinite(s) || !Number.isFinite(e) || e - s < AGENDA_LIMITS.minMinutes) return "time";
  return undefined;
}

/** Del formulario a los campos del bloque (ya normalizados), o undefined si no vale. */
function fieldsOf(d: AgendaDraft): Omit<AgendaDef, "id" | "createdAt"> | undefined {
  if (agendaDraftError(d)) return undefined;
  const days = d.repeat === "daily" ? [0, 1, 2, 3, 4, 5, 6] : d.repeat === "days" ? d.days : [];
  const def = normalizeAgenda({
    id: "",
    createdAt: 0,
    title: d.title,
    date: d.date,
    start: parseClock(d.start),
    end: parseClock(d.end),
    notes: d.notes,
    color: AGENDA_COLORS.includes(d.color) ? d.color : "gold",
    repeat: days.length ? { days, until: isDateKey(d.until) ? d.until : undefined } : undefined,
  });
  if (!def) return undefined;
  const { id: _id, createdAt: _c, ...fields } = def;
  return fields;
}

/** Crea o edita un bloque. Al editar, el parche lleva solo lo que cambia. */
export async function saveAgenda(d: AgendaDraft, editId?: string): Promise<boolean> {
  const fields = fieldsOf(d);
  const { state, dispatch } = useGame.getState();
  if (!fields) return false;
  if (editId) {
    const cur = state.agenda.get(editId);
    if (!cur) return false;
    const patch: AgendaPatch = {};
    for (const k of Object.keys(fields) as (keyof typeof fields)[]) {
      if (JSON.stringify(fields[k]) !== JSON.stringify(cur[k])) Object.assign(patch, { [k]: fields[k] });
    }
    // Quitar la repetición: `repeat` vacío no sobrevive al JSON, así que va como días vacíos.
    if (cur.repeat && !fields.repeat) patch.repeat = { days: [] };
    const e = Object.keys(patch).length ? await dispatch({ type: "agenda_updated", entryId: editId, patch }) : undefined;
    offerUndo(e, () => i18n.t("agenda.toast.updated", { title: fields.title }));
  } else {
    const e = await dispatch({ type: "agenda_created", entry: { ...fields, id: uid(), createdAt: Date.now() } });
    offerUndo(e, () => i18n.t("agenda.toast.created", { title: fields.title }));
  }
  sfx.tick();
  useAgendaUi.getState().setForm(undefined);
  return true;
}

/** Quita un bloque entero (todos sus días). */
export async function deleteAgenda(id: string) {
  const { state, dispatch } = useGame.getState();
  const e = state.agenda.get(id);
  if (!e) return;
  sfx.paperRip(0.6);
  const ev = await dispatch({ type: "agenda_deleted", entryId: id });
  useAgendaUi.getState().setForm(undefined);
  offerUndo(ev, () => i18n.t("agenda.toast.deleted", { title: e.title }));
}

/** Quita un solo día de un bloque que se repite; si no se repite, lo quita entero. */
export async function skipAgendaDay(id: string, date: string, label: string) {
  const { state, dispatch } = useGame.getState();
  const e = state.agenda.get(id);
  if (!e) return;
  if (!e.repeat) return deleteAgenda(id);
  sfx.paperRip(0.4);
  const ev = await dispatch({ type: "agenda_skipped", entryId: id, date });
  useAgendaUi.getState().setForm(undefined);
  offerUndo(ev, () => i18n.t("agenda.toast.skipped", { title: e.title, date: label }));
}

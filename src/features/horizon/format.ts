// Fechas de los plazos en el idioma activo. Usa i18n, por eso no está en model.ts.

import i18n, { LANGS, currentLang } from "../../i18n";
import { daysUntil } from "../temporal/model";
import { isOverdue, type Due } from "./model";

const locale = () => LANGS[currentLang()].locale;
const clock = (ms: number) => new Intl.DateTimeFormat(locale(), { hour: "2-digit", minute: "2-digit" }).format(ms);

/** Cuenta atrás corta para la tarjeta: «Vencida», «Hoy, 10:00», «Mañana», «En 5 días». */
export function dueLabel(due: Due, now: number): string {
  if (isOverdue(due, now)) return i18n.t("horizon.due.overdue");
  const days = daysUntil(due.dueAt, now);
  if (days <= 0) return due.allDay ? i18n.t("horizon.due.today") : i18n.t("horizon.due.todayAt", { time: clock(due.dueAt) });
  if (days === 1) return i18n.t("horizon.due.tomorrow");
  return i18n.t("horizon.due.inDays", { n: days });
}

/** «mar, 14 oct» (y la hora, si la tiene). */
export function dueDate(due: Due): string {
  const day = new Intl.DateTimeFormat(locale(), { weekday: "short", day: "numeric", month: "short" }).format(due.dueAt);
  return due.allDay ? day : `${day} · ${clock(due.dueAt)}`;
}

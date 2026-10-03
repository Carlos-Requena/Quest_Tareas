// Fechas de los encargos en el idioma activo. Usa i18n, por eso no está en model.ts.

import i18n, { LANGS, currentLang } from "../../i18n";
import { formatRemaining } from "../../lib/time";
import { daysUntil, urgencyOf, type TemporalState, type Urgency } from "./model";

const locale = () => LANGS[currentLang()].locale;

export const clock = (ms: number) => new Intl.DateTimeFormat(locale(), { hour: "2-digit", minute: "2-digit" }).format(ms);

/** «mar, 14 oct · 10:00» (cartel del tablón). */
export function shortDue(t: Pick<TemporalState, "dueAt" | "allDay">): string {
  const day = new Intl.DateTimeFormat(locale(), { weekday: "short", day: "numeric", month: "short" }).format(t.dueAt);
  return t.allDay ? day : `${day} · ${clock(t.dueAt)}`;
}

/** «martes, 14 de octubre de 2026 · 10:00» (cartel en grande y animaciones). */
export function longDue(t: Pick<TemporalState, "dueAt" | "allDay">): string {
  const day = new Intl.DateTimeFormat(locale(), { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(t.dueAt);
  return `${day} · ${t.allDay ? i18n.t("temporal.when.allDay") : clock(t.dueAt)}`;
}

/** «03/10/26»: la fecha pequeña del sello «ACCEPTED». */
export const sealDate = (ms: number) => new Intl.DateTimeFormat(locale(), { day: "2-digit", month: "2-digit", year: "2-digit" }).format(ms);

export const longDate = (ms: number) => new Intl.DateTimeFormat(locale(), { day: "numeric", month: "long", year: "numeric" }).format(ms);

/** Etiqueta de cuenta atrás y su urgencia: «Faltan 2 h», «Mañana, 10:00», «En 5 días», «Vencido»… */
export function dueChip(t: TemporalState, now: number): { label: string; urgency: Urgency } {
  const urgency = urgencyOf(t, now);
  const days = daysUntil(t.dueAt, now);
  let label: string;
  switch (urgency) {
    case "done":
      label = i18n.t("temporal.when.done");
      break;
    case "overdue":
      label = days < 0 ? i18n.t("temporal.when.ago", { count: -days }) : i18n.t("temporal.when.overdue");
      break;
    case "today":
      if (t.allDay) label = i18n.t("temporal.when.today");
      else label = t.dueAt - now <= 3 * 3_600_000 ? i18n.t("temporal.when.left", { time: formatRemaining(t.dueAt - now) }) : i18n.t("temporal.when.todayAt", { time: clock(t.dueAt) });
      break;
    default:
      if (days === 1) label = t.allDay ? i18n.t("temporal.when.tomorrow") : i18n.t("temporal.when.tomorrowAt", { time: clock(t.dueAt) });
      else label = i18n.t("temporal.when.inDays", { n: days });
  }
  return { label, urgency };
}

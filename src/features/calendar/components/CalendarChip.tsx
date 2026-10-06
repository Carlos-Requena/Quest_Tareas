import { useTranslation } from "react-i18next";
import { CATEGORY_META } from "../../../domain/types";
import { formatClock } from "../../agenda/model";
import { AGENDA_COLOR_VAR } from "../../agenda/components/AgendaForm";
import { Skull } from "../../temporal/components/Skull";
import type { CalendarItem } from "../model";
import { openCalendarItem } from "../actions";

/** Color de cada cosa del calendario: el del bloque, el de la categoría de la quest o el del encargo. */
export function itemColor(item: CalendarItem): string {
  if (item.kind === "agenda") return AGENDA_COLOR_VAR[item.color];
  if (item.kind === "quest") return CATEGORY_META[item.category].color;
  return "var(--skull)";
}

/** Una cosa de un día en la vista de semana: bloque de agenda, encargo o quest con fecha límite. */
export function CalendarChip({ item, date }: { item: CalendarItem; date: string }) {
  const { t } = useTranslation();
  const state =
    item.kind === "temporal"
      ? item.burned
        ? t("failure.when.burned")
        : item.done
          ? t("calendar.item.done")
          : !item.accepted
            ? t("calendar.item.planned")
            : undefined
      : item.kind === "quest"
        ? item.failed
          ? t("calendar.item.failed")
          : item.active
            ? t("calendar.item.active")
            : item.done
              ? t("calendar.item.doneToday")
              : item.repeats
                ? t("calendar.item.repeatsToday")
                : t("calendar.item.deadline")
        : item.repeats
          ? t("calendar.item.repeats")
          : undefined;
  const cls = [
    "cal-chip",
    `is-${item.kind}`,
    item.kind === "temporal" && !item.accepted ? "is-planned" : "",
    item.kind === "temporal" && item.done ? "is-done" : "",
    item.kind === "temporal" && item.burned ? "is-burned" : "",
    item.kind === "quest" && item.active ? "is-active" : "",
    // Quests que se repiten por días (features/complex) y las fracturadas (features/failure).
    item.kind === "quest" && item.repeats ? "is-weekly" : "",
    item.kind === "quest" && item.done ? "is-done" : "",
    item.kind === "quest" && item.failed ? "is-failed" : "",
  ].join(" ");

  return (
    <button
      className={cls}
      style={{ "--c": itemColor(item) } as React.CSSProperties}
      title={state ? `${item.title} · ${state}` : item.title}
      onClick={(e) => {
        e.stopPropagation();
        openCalendarItem(item, date);
      }}
    >
      {item.kind === "temporal" && <Skull className={item.done ? "skull-gold" : ""} />}
      {item.kind === "quest" && <span className="gem" />}
      {(item.kind === "agenda" || (item.kind === "temporal" && item.start !== undefined)) && (
        <span className="cal-time num">
          {formatClock(item.start!)}
          {item.kind === "agenda" && `–${formatClock(item.end)}`}
        </span>
      )}
      <span className="cal-chip-title">{item.title}</span>
      {(item.kind === "agenda" || item.kind === "quest") && item.repeats && (
        <span className="cal-rep" aria-label={state}>
          {item.kind === "quest" && item.done ? "✓" : "↻"}
        </span>
      )}
      {item.kind === "temporal" && (item.done || !item.accepted) && <span className="cal-state">{state}</span>}
    </button>
  );
}

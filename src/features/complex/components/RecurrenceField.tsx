import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Category } from "../../../domain/types";
import { RECURRENCE_PRESETS, RECURRENCE_UNITS, recurrenceMinutes, splitMinutes, type RecurrenceUnit } from "../model";
import "../complex.css";

/** Los días en el orden de la semana española: de lunes a domingo (0 = domingo). */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * Repetición de una quest: «no se repite», una de las opciones de siempre (1 h … 1 semana),
 * personalizada («cada 3 días») o ciertos días de la semana («lunes, miércoles y viernes»).
 * Las repetibles no tienen «no se repite». `disabled`: en curso no se cambia (features/editing).
 */
export function RecurrenceField({
  category,
  value,
  onChange,
  days,
  onDays,
  disabled,
}: {
  category: Category;
  value?: number;
  onChange(v?: number): void;
  /** Días de la semana (0 = domingo … 6 = sábado). Si los hay, mandan sobre `value`. */
  days?: number[];
  onDays?(d?: number[]): void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const isPreset = value !== undefined && RECURRENCE_PRESETS.some((p) => p.minutes === value);
  const [custom, setCustom] = useState(value !== undefined && !isPreset && !days?.length);
  const split = splitMinutes(value ?? 3 * 24 * 60);
  const repeat = category === "repeat";
  const weekly = !!days?.length;
  const letters = t("agenda.weekdays", { returnObjects: true }) as string[];
  const names = t("agenda.weekdayNames", { returnObjects: true }) as string[];

  const presetLabel = (p: (typeof RECURRENCE_PRESETS)[number]) => {
    const base = p.unit === "weeks" ? t("cooldowns.week") : t(`cooldowns.${p.unit}`, { count: p.count });
    return p.daily ? t("cooldowns.daily", { label: base }) : base;
  };

  const choice = weekly ? "days" : custom ? "custom" : value === undefined ? "none" : String(value);

  const toggleDay = (d: number) => {
    const next = days?.includes(d) ? days.filter((x) => x !== d) : [...(days ?? []), d];
    // Sin ningún día deja de repetirse por días: vuelve a «cada N» o a «no se repite».
    onDays?.(next.length ? next.sort((a, b) => a - b) : undefined);
  };

  return (
    <div className={`field ${disabled ? "is-locked" : ""}`}>
      <span className="lbl">{repeat ? t("complex.recurrence.labelRepeat") : t("complex.recurrence.label")}</span>
      <div className="rc-row">
        <select
          value={choice}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value;
            setCustom(v === "custom");
            if (v === "days") {
              // Por defecto, el día de hoy.
              onDays?.([new Date().getDay()]);
              return;
            }
            onDays?.(undefined);
            if (v === "none") onChange(undefined);
            else if (v === "custom") onChange(recurrenceMinutes(split.count, split.unit));
            else onChange(Number(v));
          }}
        >
          {!repeat && <option value="none">{t("complex.recurrence.none")}</option>}
          {RECURRENCE_PRESETS.map((p) => (
            <option key={p.minutes} value={p.minutes}>
              {presetLabel(p)}
            </option>
          ))}
          <option value="custom">{t("complex.recurrence.custom")}</option>
          {onDays && <option value="days">{t("complex.recurrence.weekdays")}</option>}
        </select>
        {custom && !weekly && (
          <>
            <span className="muted rc-every">{t("complex.recurrence.every")}</span>
            <input
              type="number"
              min={1}
              className="num-in rc-n"
              disabled={disabled}
              value={split.count}
              onChange={(e) => onChange(recurrenceMinutes(Number(e.target.value), split.unit))}
            />
            <select className="rc-unit" disabled={disabled} value={split.unit} onChange={(e) => onChange(recurrenceMinutes(split.count, e.target.value as RecurrenceUnit))}>
              {RECURRENCE_UNITS.map((u) => (
                <option key={u} value={u}>
                  {t(`complex.recurrence.units.${u}`)}
                </option>
              ))}
            </select>
          </>
        )}
        {weekly && (
          <div className="rc-days" role="group" aria-label={t("complex.recurrence.weekdays")}>
            {WEEK_ORDER.map((d) => (
              <button
                type="button"
                key={d}
                disabled={disabled}
                className={`rc-day ${days?.includes(d) ? "on" : ""}`}
                aria-pressed={!!days?.includes(d)}
                title={names[d]}
                onClick={() => toggleDay(d)}
              >
                {letters[d]}
              </button>
            ))}
          </div>
        )}
      </div>
      {weekly ? (
        <p className="rc-hint muted">{t("complex.recurrence.weekdaysHint")}</p>
      ) : (
        !repeat && value !== undefined && <p className="rc-hint muted">{t("complex.recurrence.hint")}</p>
      )}
    </div>
  );
}

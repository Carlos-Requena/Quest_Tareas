import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Category } from "../../../domain/types";
import { RECURRENCE_PRESETS, RECURRENCE_UNITS, recurrenceMinutes, splitMinutes, type RecurrenceUnit } from "../model";
import "../complex.css";

/**
 * Repetición de una quest nueva: «no se repite», una de las opciones de siempre
 * (1 h … 1 semana) o personalizada («cada 3 días»). Las repetibles no tienen «no se repite».
 */
export function RecurrenceField({ category, value, onChange }: { category: Category; value?: number; onChange(v?: number): void }) {
  const { t } = useTranslation();
  const isPreset = value !== undefined && RECURRENCE_PRESETS.some((p) => p.minutes === value);
  const [custom, setCustom] = useState(value !== undefined && !isPreset);
  const split = splitMinutes(value ?? 3 * 24 * 60);
  const repeat = category === "repeat";

  const presetLabel = (p: (typeof RECURRENCE_PRESETS)[number]) => {
    const base = p.unit === "weeks" ? t("cooldowns.week") : t(`cooldowns.${p.unit}`, { count: p.count });
    return p.daily ? t("cooldowns.daily", { label: base }) : base;
  };

  const choice = custom ? "custom" : value === undefined ? "none" : String(value);

  return (
    <div className="field">
      <span className="lbl">{repeat ? t("complex.recurrence.labelRepeat") : t("complex.recurrence.label")}</span>
      <div className="rc-row">
        <select
          value={choice}
          onChange={(e) => {
            const v = e.target.value;
            setCustom(v === "custom");
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
        </select>
        {custom && (
          <>
            <span className="muted rc-every">{t("complex.recurrence.every")}</span>
            <input
              type="number"
              min={1}
              className="num-in rc-n"
              value={split.count}
              onChange={(e) => onChange(recurrenceMinutes(Number(e.target.value), split.unit))}
            />
            <select className="rc-unit" value={split.unit} onChange={(e) => onChange(recurrenceMinutes(split.count, e.target.value as RecurrenceUnit))}>
              {RECURRENCE_UNITS.map((u) => (
                <option key={u} value={u}>
                  {t(`complex.recurrence.units.${u}`)}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
      {!repeat && value !== undefined && <p className="rc-hint muted">{t("complex.recurrence.hint")}</p>}
    </div>
  );
}

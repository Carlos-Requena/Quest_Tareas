import { useState } from "react";
import { useTranslation } from "react-i18next";
import { sfx } from "../../../lib/sfx";
import { DEADLINE_PRESETS, deadlineIn } from "../model";
import { dueDate } from "../format";
import "../horizon.css";

const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const fromIso = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : undefined;
};

/**
 * Fecha límite de una quest nueva: sin fecha, uno de los plazos del filtro (1 día,
 * 7 días, 2 semanas, 1 mes) u otra fecha. Se guarda como medianoche local de ese día.
 */
export function DeadlineField({ value, onChange, disabled }: { value?: number; onChange(v?: number): void; disabled?: boolean }) {
  const { t } = useTranslation();
  // El «ahora» del formulario se fija al abrirlo: los atajos no cambian mientras se escribe.
  const [now] = useState(() => Date.now());
  const preset = DEADLINE_PRESETS.find((p) => deadlineIn(p.days, now) === value);
  const [other, setOther] = useState(value !== undefined && !preset);
  const pick = (v?: number, custom = false) => {
    sfx.move();
    setOther(custom);
    onChange(v);
  };

  return (
    <div className="field">
      <span className="lbl">{t("horizon.form.label")}</span>
      {disabled ? (
        <p className="dl-hint muted">{t("horizon.form.recurring")}</p>
      ) : (
        <>
          <div className="seg dl-seg">
            <button type="button" className={`seg-btn ${value === undefined ? "on" : ""}`} style={{ "--c": "var(--muted)" } as React.CSSProperties} onClick={() => pick(undefined)}>
              {t("horizon.form.none")}
            </button>
            {DEADLINE_PRESETS.map((p) => (
              <button
                type="button"
                key={p.horizon}
                className={`seg-btn hz-${p.horizon} ${!other && preset === p ? "on" : ""}`}
                style={{ "--c": "var(--hz-c)" } as React.CSSProperties}
                title={dueDate({ dueAt: deadlineIn(p.days, now), allDay: true })}
                onClick={() => pick(deadlineIn(p.days, now))}
              >
                <span className="gem" />
                {t(`horizon.filter.${p.horizon}`)}
              </button>
            ))}
            <button
              type="button"
              className={`seg-btn ${other ? "on" : ""}`}
              style={{ "--c": "var(--gold)" } as React.CSSProperties}
              onClick={() => pick(value ?? deadlineIn(3, now), true)}
            >
              {t("horizon.form.other")}
            </button>
          </div>
          <div className="dl-row">
            {other && <input type="date" value={value !== undefined ? isoDate(value) : ""} onChange={(e) => onChange(fromIso(e.target.value))} />}
            <span className="dl-hint muted">{value !== undefined ? dueDate({ dueAt: value, allDay: true }) + " · " : ""}{t("horizon.form.hint")}</span>
          </div>
        </>
      )}
    </div>
  );
}

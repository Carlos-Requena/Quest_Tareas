import { useTranslation } from "react-i18next";
import { formatRemaining } from "../../../lib/time";
import { POMODORO_LIMITS, clampPlan, planTotalMs } from "../model";
import "../pomodoro.css";

export interface PomodoroDraft {
  /** Rondas. */
  target: number;
  focusMinutes: number;
  breakMinutes: number;
}

/** Rondas, concentración y descanso de una condición de pomodoro en el formulario. */
export function PomodoroConditionInputs({
  value,
  onChange,
}: {
  value: PomodoroDraft;
  onChange(v: PomodoroDraft): void;
}) {
  const { t } = useTranslation();
  const plan = clampPlan({ rounds: value.target, focusMinutes: value.focusMinutes, breakMinutes: value.breakMinutes });
  const total = formatRemaining(planTotalMs(plan));

  return (
    <div className="pomo-inputs">
      <label className="field">
        <span className="lbl">{t("pomodoro.form.rounds")}</span>
        <input enterKeyHint="done" inputMode="numeric"
          type="number"
          min={POMODORO_LIMITS.rounds.min}
          max={POMODORO_LIMITS.rounds.max}
          value={value.target}
          onChange={(e) => onChange({ ...value, target: Number(e.target.value) })}
        />
      </label>
      <label className="field">
        <span className="lbl">{t("pomodoro.form.focus")}</span>
        <input enterKeyHint="done" inputMode="numeric"
          type="number"
          min={POMODORO_LIMITS.focus.min}
          max={POMODORO_LIMITS.focus.max}
          value={value.focusMinutes}
          onChange={(e) => onChange({ ...value, focusMinutes: Number(e.target.value) })}
        />
      </label>
      <label className="field">
        <span className="lbl">{t("pomodoro.form.break")}</span>
        <input enterKeyHint="done" inputMode="numeric"
          type="number"
          min={POMODORO_LIMITS.break.min}
          max={POMODORO_LIMITS.break.max}
          value={value.breakMinutes}
          onChange={(e) => onChange({ ...value, breakMinutes: Number(e.target.value) })}
        />
      </label>
      <span className="pomo-hint muted">
        {plan.rounds > 1 ? t("pomodoro.total", { total }) : t("pomodoro.totalSingle", { total })}
      </span>
    </div>
  );
}

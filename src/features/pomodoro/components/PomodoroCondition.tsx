import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import type { PomodoroConditionDef, QuestState } from "../../../domain/types";
import { useNow, formatRemaining } from "../../../lib/time";
import { formatClock, newPomodoro, planOf, viewPomodoro, type PomodoroView } from "../model";
import { pausePomodoro, resumePomodoro, skipBreak, startPomodoro, stopPomodoro } from "../actions";
import "../pomodoro.css";

function Ring({ v, clock, label }: { v: PomodoroView; clock: string; label: string }) {
  return (
    <motion.div
      className={`pomo-ring phase-${v.phase}`}
      animate={v.phase === "done" ? { scale: [1, 1.07, 1] } : { scale: 1 }}
      transition={{ duration: 0.6 }}
    >
      <svg viewBox="0 0 100 100" aria-hidden>
        <circle className="pomo-track" cx="50" cy="50" r="44" />
        <motion.circle
          className="pomo-arc"
          cx="50"
          cy="50"
          r="44"
          pathLength={1}
          strokeDasharray="1 2"
          transform="rotate(-90 50 50)"
          initial={false}
          animate={{ strokeDashoffset: 1 - Math.min(1, Math.max(0, v.progress)) }}
          transition={{ duration: 0.9, ease: "linear" }}
        />
      </svg>
      <div className="pomo-center">
        <span className="pomo-clock num">{clock}</span>
        <span className="pomo-phase">{label}</span>
      </div>
    </motion.div>
  );
}

/** Marcadores de ronda: rombo lleno = completada, con brillo = en curso. */
function RoundPips({ v, active }: { v: PomodoroView; active: boolean }) {
  return (
    <span className="pomo-pips" aria-hidden>
      {Array.from({ length: v.rounds }, (_, i) => {
        const done = active && i < v.completedRounds;
        const current = active && !v.done && i === v.round - 1 && v.segment === "focus" && v.phase !== "idle";
        return <span key={i} className={`pomo-pip ${done ? "done" : ""} ${current ? "current" : ""}`} />;
      })}
    </span>
  );
}

/**
 * Condición de pomodoro dentro de la lista de objetivos: la fila con su progreso
 * (rondas completadas / rondas) y, debajo, el temporizador con sus controles.
 */
export function PomodoroCondition({ quest, cond }: { quest: QuestState; cond: PomodoroConditionDef }) {
  const now = useNow(1000);
  const { t } = useTranslation();
  const [confirmStop, setConfirmStop] = useState(false);

  useEffect(() => {
    if (!confirmStop) return;
    const timer = setTimeout(() => setConfirmStop(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmStop]);

  const active = quest.status === "active";
  const plan = planOf(cond);
  const v = viewPomodoro((active && quest.pomodoros[cond.id]) || newPomodoro(), plan, now);
  const completed = active ? v.completedRounds : 0;
  const met = completed >= cond.target;

  const clock = v.phase === "done" ? formatClock(v.totalMs) : v.phase === "idle" ? formatClock(v.focusMs) : formatClock(v.remainingMs);
  const phaseLabel = v.phase === "paused" ? t("pomodoro.phase.paused") : t(`pomodoro.phase.${v.phase}`);

  let note: string | undefined;
  if (!active) note = t("pomodoro.acceptFirst");
  else if (v.done) note = t("pomodoro.completed");
  else if (v.phase === "idle" && v.lastPartialMs !== undefined)
    note = t("pomodoro.lastSession", { round: v.round, elapsed: formatClock(v.lastPartialMs), total: formatClock(v.focusMs) });

  const ids = [quest.id, cond.id] as const;
  const running = v.phase === "focus" || v.phase === "break";

  return (
    <div className={`cond-pomo phase-${v.phase}`}>
      <div className={`cond ${met ? "done" : ""}`}>
        <span className="cond-kind">
          {met ? "✓" : "◷"} {t("pomodoro.kind")}
        </span>
        <span className="cond-label">{cond.label || t("pomodoro.defaultLabel")}</span>
        <span className="cond-bar">
          <motion.span
            className="cond-fill"
            animate={{ width: `${(completed / cond.target) * 100}%` }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          />
        </span>
        <span className="num cond-val">
          {completed} <small>/ {cond.target}</small>
        </span>
        <span />
      </div>

      <div className="pomo">
        <Ring v={v} clock={clock} label={phaseLabel} />
        <div className="pomo-side">
          <span className="pomo-config">
            {t("pomodoro.plan", { rounds: plan.rounds, focus: plan.focusMinutes, break: plan.breakMinutes })}
          </span>
          <span className="pomo-total muted">
            {plan.rounds > 1
              ? t("pomodoro.total", { total: formatRemaining(v.totalMs) })
              : t("pomodoro.totalSingle", { total: formatRemaining(v.totalMs) })}
          </span>
          <span className="pomo-roundline">
            <RoundPips v={v} active={active} />
            {active && !v.done && <span className="pomo-round">{t("pomodoro.round", { round: v.round, rounds: v.rounds })}</span>}
          </span>
          {note && <span className={`pomo-note ${v.done ? "is-good" : ""}`}>{note}</span>}
          {active && !v.done && (
            <div className="pomo-btns">
              {v.phase === "idle" && (
                <button className="pomo-btn primary" onClick={() => startPomodoro(...ids)}>
                  ▶ {t("pomodoro.start")}
                </button>
              )}
              {running && (
                <button className="pomo-btn" onClick={() => pausePomodoro(...ids)}>
                  ❚❚ {t("pomodoro.pause")}
                </button>
              )}
              {v.phase === "paused" && (
                <button className="pomo-btn primary" onClick={() => resumePomodoro(...ids)}>
                  ▶ {t("pomodoro.resume")}
                </button>
              )}
              {v.segment === "break" && v.phase !== "idle" && (
                <button className="pomo-btn" onClick={() => skipBreak(...ids)}>
                  ⏭ {t("pomodoro.skipBreak")}
                </button>
              )}
              {v.phase !== "idle" && (
                <button
                  className={`pomo-btn danger ${confirmStop ? "is-armed" : ""}`}
                  onClick={() => {
                    if (!confirmStop) return setConfirmStop(true);
                    setConfirmStop(false);
                    stopPomodoro(...ids);
                  }}
                >
                  ■ {confirmStop ? t("pomodoro.stopConfirm") : t("pomodoro.stop")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

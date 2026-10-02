// Modelo puro del pomodoro: sin React, sin store, sin Tauri.
// El dominio (src/domain) importa SOLO model.ts, events.ts y legacy.ts, nunca index.ts.

import type { PomodoroEventBody } from "./events";

/** Duraciones de una ronda. */
export interface PomodoroConfig {
  focusMinutes: number;
  breakMinutes: number;
}

/** Plan completo de una condición de pomodoro: N rondas; la última sin descanso. */
export interface PomodoroPlan extends PomodoroConfig {
  rounds: number;
}

export const DEFAULT_POMODORO: PomodoroConfig = { focusMinutes: 90, breakMinutes: 15 };

export const POMODORO_LIMITS = {
  focus: { min: 1, max: 240 },
  break: { min: 0, max: 60 },
  rounds: { min: 1, max: 12 },
} as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v) || lo));

export function clampPlan(p: PomodoroPlan): PomodoroPlan {
  return {
    focusMinutes: clamp(p.focusMinutes, POMODORO_LIMITS.focus.min, POMODORO_LIMITS.focus.max),
    breakMinutes: clamp(p.breakMinutes, POMODORO_LIMITS.break.min, POMODORO_LIMITS.break.max),
    rounds: clamp(p.rounds, POMODORO_LIMITS.rounds.min, POMODORO_LIMITS.rounds.max),
  };
}

/** El plan de una condición de pomodoro: su `target` es el número de rondas. */
export const planOf = (c: PomodoroConfig & { target: number }): PomodoroPlan => ({
  focusMinutes: c.focusMinutes,
  breakMinutes: c.breakMinutes,
  rounds: Math.max(1, c.target),
});

/** Duración total: N concentraciones + (N − 1) descansos. */
export const planTotalMs = (p: PomodoroPlan) =>
  p.rounds * p.focusMinutes * 60_000 + (p.rounds - 1) * p.breakMinutes * 60_000;

export type PomodoroStatus = "idle" | "running" | "paused";

/**
 * Estado de juego de una condición de pomodoro. Vive en QuestState.pomodoros[conditionId].
 * Toda la secuencia (concentración, descanso, concentración…) es UNA línea de tiempo:
 * solo se guarda cuánto se ha avanzado en ella. La fase se calcula con viewPomodoro(now).
 */
export interface Pomodoro {
  status: PomodoroStatus;
  /** Avance en la línea de tiempo antes de `runningSince` (tramos ya pausados). */
  offsetMs: number;
  /** Momento en que empezó el tramo actual. */
  runningSince?: number;
  /** Concentración de la última ronda interrumpida (se muestra, no cuenta). */
  lastPartialMs?: number;
}

export type PomodoroPhase = "idle" | "focus" | "paused" | "break" | "done";

export interface PomodoroView {
  phase: PomodoroPhase;
  /** Tramo en el que está la línea de tiempo (también en pausa o parada). */
  segment: "focus" | "break";
  /** Ronda actual, de 1 a N. */
  round: number;
  rounds: number;
  /** Rondas de concentración completadas: el progreso de la condición. */
  completedRounds: number;
  focusMs: number;
  breakMs: number;
  totalMs: number;
  /** Lo que queda del tramo actual. */
  remainingMs: number;
  /** Avance del tramo actual, de 0 a 1 (para el anillo). */
  progress: number;
  done: boolean;
  lastPartialMs?: number;
}

export const newPomodoro = (): Pomodoro => ({ status: "idle", offsetMs: 0 });

function timeline(p: Pomodoro, now: number): number {
  const running = p.status === "running" && p.runningSince !== undefined ? Math.max(0, now - p.runningSince) : 0;
  return p.offsetMs + running;
}

/** Fase, ronda y tiempos del pomodoro en el instante `now`. Función pura. */
export function viewPomodoro(p: Pomodoro, plan: PomodoroPlan, now: number): PomodoroView {
  const F = plan.focusMinutes * 60_000;
  const B = plan.breakMinutes * 60_000;
  const N = Math.max(1, plan.rounds);
  const cycle = F + B;
  const total = planTotalMs({ ...plan, rounds: N });
  const t = Math.min(total, timeline(p, now));
  // La ronda i termina en i·cycle − B; las completadas son las que ya terminaron.
  const completedRounds = Math.min(N, Math.floor((t + B) / cycle));
  const base = { rounds: N, completedRounds, focusMs: F, breakMs: B, totalMs: total, lastPartialMs: p.lastPartialMs };

  if (t >= total) {
    return { ...base, phase: "done", segment: "focus", round: N, remainingMs: 0, progress: 1, done: true };
  }

  const k = Math.floor(t / cycle);
  const within = t - k * cycle;
  const segment = within < F ? "focus" : "break";
  const remainingMs = segment === "focus" ? F - within : cycle - within;
  const progress = segment === "focus" ? within / F : (within - F) / B;
  const phase: PomodoroPhase = p.status === "running" ? segment : p.status === "paused" ? "paused" : "idle";
  return { ...base, phase, segment, round: k + 1, remainingMs, progress, done: false };
}

/**
 * Aplica un evento del pomodoro en el instante del evento (`e.ts`).
 * Las guardas ignoran eventos imposibles, igual que project() con las quests.
 */
export function applyPomodoroEvent(
  p: Pomodoro,
  plan: PomodoroPlan,
  e: PomodoroEventBody & { ts: number },
): Pomodoro {
  const v = viewPomodoro(p, plan, e.ts);
  const cycle = v.focusMs + v.breakMs;
  const t = Math.min(v.totalMs, timeline(p, e.ts));
  const k = Math.floor(t / cycle);

  switch (e.type) {
    case "pomodoro_started":
      return v.phase === "idle" ? { ...p, status: "running", runningSince: e.ts, lastPartialMs: undefined } : p;

    case "pomodoro_paused":
      return v.phase === "focus" || v.phase === "break"
        ? { ...p, status: "paused", offsetMs: t, runningSince: undefined }
        : p;

    case "pomodoro_resumed":
      return v.phase === "paused" ? { ...p, status: "running", runningSince: e.ts } : p;

    case "pomodoro_stopped": {
      // Terminar antes de tiempo: se pierde solo la ronda en curso; las completadas se conservan.
      if (v.phase !== "focus" && v.phase !== "break" && v.phase !== "paused") return p;
      const inFocus = v.segment === "focus";
      const partial = t - k * cycle;
      return {
        status: "idle",
        offsetMs: inFocus ? k * cycle : (k + 1) * cycle,
        lastPartialMs: inFocus && partial > 0 ? partial : undefined,
      };
    }

    case "pomodoro_break_skipped":
      return v.segment === "break" && (v.phase === "break" || v.phase === "paused")
        ? { ...p, offsetMs: (k + 1) * cycle, runningSince: p.status === "running" ? e.ts : undefined }
        : p;
  }
}

/** Reloj mm:ss; los minutos pueden pasar de 60 ("90:00"). */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

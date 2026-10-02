import { describe, expect, it } from "vitest";
import { applyPomodoroEvent, clampPlan, formatClock, newPomodoro, planOf, planTotalMs, viewPomodoro, type Pomodoro, type PomodoroPlan } from "./model";
import type { PomodoroEventBody } from "./events";
import { MIN, T0 } from "../../test/streams";

// 2 rondas de 25 + 5: 25 concentración, 5 descanso, 25 concentración (la última sin descanso) = 55 min.
const plan: PomodoroPlan = { focusMinutes: 25, breakMinutes: 5, rounds: 2 };
const ev = (type: PomodoroEventBody["type"], ts: number) => ({ type, questId: "q", ts }) as PomodoroEventBody & { ts: number };
const apply = (p: Pomodoro, ...steps: [PomodoroEventBody["type"], number][]) =>
  steps.reduce((acc, [type, ts]) => applyPomodoroEvent(acc, plan, ev(type, ts)), p);
const started = () => apply(newPomodoro(), ["pomodoro_started", T0]);

describe("viewPomodoro: la línea de tiempo", () => {
  it("la duración total no incluye el descanso de la última ronda", () => {
    expect(planTotalMs(plan)).toBe(55 * MIN);
    expect(planTotalMs({ ...plan, rounds: 1 })).toBe(25 * MIN);
  });

  it("sin empezar: en reposo, ronda 1, sin rondas completadas", () => {
    const v = viewPomodoro(newPomodoro(), plan, T0 + 999 * MIN);
    expect(v).toMatchObject({ phase: "idle", round: 1, completedRounds: 0, remainingMs: 25 * MIN, done: false });
  });

  it("recorre concentración, descanso y la última ronda hasta terminar", () => {
    const p = started();
    expect(viewPomodoro(p, plan, T0 + 10 * MIN)).toMatchObject({ phase: "focus", round: 1, completedRounds: 0, progress: 0.4 });
    expect(viewPomodoro(p, plan, T0 + 25 * MIN)).toMatchObject({ phase: "break", round: 1, completedRounds: 1, remainingMs: 5 * MIN });
    expect(viewPomodoro(p, plan, T0 + 30 * MIN)).toMatchObject({ phase: "focus", round: 2, completedRounds: 1 });
    expect(viewPomodoro(p, plan, T0 + 54 * MIN)).toMatchObject({ phase: "focus", round: 2, completedRounds: 1, remainingMs: MIN });
    expect(viewPomodoro(p, plan, T0 + 55 * MIN)).toMatchObject({ phase: "done", completedRounds: 2, remainingMs: 0, done: true });
    // Pasado el final no cuenta de más.
    expect(viewPomodoro(p, plan, T0 + 999 * MIN).completedRounds).toBe(2);
  });

  it("con una ronda termina al acabar la concentración, sin descanso", () => {
    const one = { ...plan, rounds: 1 };
    const p = applyPomodoroEvent(newPomodoro(), one, ev("pomodoro_started", T0));
    expect(viewPomodoro(p, one, T0 + 25 * MIN)).toMatchObject({ phase: "done", completedRounds: 1 });
  });
});

describe("applyPomodoroEvent: transiciones y guardas", () => {
  it("pausar congela el tiempo y reanudar sigue donde estaba", () => {
    const paused = apply(started(), ["pomodoro_paused", T0 + 10 * MIN]);
    expect(viewPomodoro(paused, plan, T0 + 500 * MIN)).toMatchObject({ phase: "paused", remainingMs: 15 * MIN });
    const resumed = apply(paused, ["pomodoro_resumed", T0 + 200 * MIN]);
    expect(viewPomodoro(resumed, plan, T0 + 215 * MIN)).toMatchObject({ phase: "break", completedRounds: 1 });
  });

  it("parar en concentración pierde solo la ronda en curso y recuerda lo hecho", () => {
    const p = apply(started(), ["pomodoro_stopped", T0 + 40 * MIN]);
    expect(p).toMatchObject({ status: "idle", offsetMs: 30 * MIN, lastPartialMs: 10 * MIN });
    expect(viewPomodoro(p, plan, T0 + 999 * MIN)).toMatchObject({ phase: "idle", round: 2, completedRounds: 1 });
  });

  it("parar en el descanso conserva la ronda terminada", () => {
    const p = apply(started(), ["pomodoro_stopped", T0 + 27 * MIN]);
    expect(p.lastPartialMs).toBeUndefined();
    expect(viewPomodoro(p, plan, T0 + 999 * MIN)).toMatchObject({ round: 2, completedRounds: 1 });
  });

  it("saltar el descanso empieza ya la siguiente ronda", () => {
    const p = apply(started(), ["pomodoro_break_skipped", T0 + 26 * MIN]);
    expect(viewPomodoro(p, plan, T0 + 26 * MIN)).toMatchObject({ phase: "focus", round: 2, remainingMs: 25 * MIN });
  });

  it("ignora los eventos imposibles", () => {
    const idle = newPomodoro();
    expect(apply(idle, ["pomodoro_paused", T0])).toBe(idle);
    expect(apply(idle, ["pomodoro_resumed", T0])).toBe(idle);
    expect(apply(idle, ["pomodoro_stopped", T0])).toBe(idle);
    expect(apply(idle, ["pomodoro_break_skipped", T0])).toBe(idle);
    const running = started();
    expect(apply(running, ["pomodoro_started", T0 + MIN])).toBe(running);
    expect(apply(running, ["pomodoro_resumed", T0 + MIN])).toBe(running);
    // Saltar el descanso en plena concentración no hace nada.
    expect(apply(running, ["pomodoro_break_skipped", T0 + 10 * MIN])).toBe(running);
    // Terminado: ni pausa ni parada.
    const done = apply(running, ["pomodoro_paused", T0 + 60 * MIN]);
    expect(done).toBe(running);
  });
});

describe("utilidades", () => {
  it("clampPlan mantiene el plan dentro de los límites", () => {
    expect(clampPlan({ focusMinutes: 0, breakMinutes: -3, rounds: 99 })).toEqual({ focusMinutes: 1, breakMinutes: 0, rounds: 12 });
    expect(clampPlan({ focusMinutes: 999, breakMinutes: 90, rounds: 0 })).toEqual({ focusMinutes: 240, breakMinutes: 60, rounds: 1 });
    expect(clampPlan({ focusMinutes: NaN, breakMinutes: 5.4, rounds: 2.6 })).toEqual({ focusMinutes: 1, breakMinutes: 5, rounds: 3 });
  });

  it("planOf usa el objetivo como rondas, al menos una", () => {
    expect(planOf({ focusMinutes: 50, breakMinutes: 10, target: 3 })).toEqual({ focusMinutes: 50, breakMinutes: 10, rounds: 3 });
    expect(planOf({ focusMinutes: 50, breakMinutes: 10, target: 0 }).rounds).toBe(1);
  });

  it("formatClock redondea hacia arriba y pasa de 60 minutos", () => {
    expect(formatClock(90 * MIN)).toBe("90:00");
    expect(formatClock(1)).toBe("00:01");
    expect(formatClock(-5)).toBe("00:00");
  });
});

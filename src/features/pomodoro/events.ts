/**
 * Eventos del pomodoro. Se suman a la unión EventBody de src/domain/events.ts.
 *
 * `conditionId` indica a qué condición de pomodoro de la quest se refieren.
 * Es opcional SOLO por compatibilidad: los eventos de la versión anterior (cuando
 * el pomodoro era un único objeto de la quest) no lo llevan. Ver legacy.ts.
 */
type PomodoroTarget = { questId: string; conditionId?: string };

export type PomodoroEventBody =
  | ({ type: "pomodoro_started" } & PomodoroTarget)
  | ({ type: "pomodoro_paused" } & PomodoroTarget)
  | ({ type: "pomodoro_resumed" } & PomodoroTarget)
  | ({ type: "pomodoro_stopped" } & PomodoroTarget)
  | ({ type: "pomodoro_break_skipped" } & PomodoroTarget);

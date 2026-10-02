// API pública del pomodoro para la interfaz.
// OJO: src/domain no debe importar este archivo (crearía un ciclo con el store);
// el dominio importa directamente ./model, ./events y ./legacy.

export * from "./model";
export type { PomodoroEventBody } from "./events";
export * from "./actions";
export { PomodoroCondition } from "./components/PomodoroCondition";
export { PomodoroConditionInputs, type PomodoroDraft } from "./components/PomodoroConditionInputs";
export { PomodoroBadge } from "./components/PomodoroBadge";
export { PomodoroWatcher } from "./components/PomodoroWatcher";

// Compatibilidad con los datos de la primera versión del pomodoro.
//
// v1: el pomodoro era un objeto único de la quest (`QuestDef.pomodoroConfig`) y sus
//     eventos no indicaban condición.
// v2: el pomodoro es un TIPO DE CONDICIÓN (`kind: "pomodoro"`, `target` = rondas).
//
// Los eventos son inmutables y ya están guardados (y quizá sincronizados), así que
// no se reescriben: se «suben de versión» al leerlos (upcasting).

import type { QuestDef } from "../../domain/types";
import type { PomodoroConfig } from "./model";

type QuestDefV1 = QuestDef & { pomodoroConfig?: PomodoroConfig };

/** Id estable de la condición generada, para que todos los dispositivos coincidan. */
export const legacyConditionId = (questId: string) => `${questId}:pomodoro`;

/** v1 → v2: `pomodoroConfig` pasa a ser una condición de pomodoro de 1 ronda. */
export function upcastQuestDef(def: QuestDefV1): QuestDef {
  if (!def.pomodoroConfig) return def;
  const { pomodoroConfig, ...rest } = def;
  return {
    ...rest,
    conditions: [
      ...rest.conditions,
      {
        id: legacyConditionId(def.id),
        kind: "pomodoro",
        label: "",
        target: 1,
        focusMinutes: pomodoroConfig.focusMinutes,
        breakMinutes: pomodoroConfig.breakMinutes,
      },
    ],
  };
}

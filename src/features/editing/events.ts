// Eventos de la edición de quests. Se suman a la unión EventBody de src/domain/events.ts.

import type { QuestPatch } from "./model";

export type EditingEventBody =
  /** Cambia los campos del parche; lo que no trae, se queda como estaba. */
  { type: "quest_updated"; questId: string; patch: QuestPatch };

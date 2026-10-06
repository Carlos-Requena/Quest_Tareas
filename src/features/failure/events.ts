// Eventos de los fallos. Se suman a la unión EventBody de src/domain/events.ts.
// Los emite el vigilante (FailureWatcher) al acabar el día de la fecha; si dos equipos
// los emiten a la vez, la guarda de la proyección deja contar solo el primero.

export type FailureEventBody =
  /** La quest se fractura: pasó el día de su fecha límite sin completarla. */
  | { type: "quest_failed"; questId: string }
  /** El cartel se quema: pasó el día del encargo sin cumplirlo. Sus quests sin terminar fallan con él. */
  | { type: "temporal_failed"; temporalId: string };

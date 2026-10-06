// Evento de deshacer. Se suma a la unión EventBody de src/domain/events.ts.

export type UndoEventBody =
  /** Deshace un evento anterior: la proyección lo salta como si no hubiera pasado. */
  { type: "event_undone"; eventId: string };

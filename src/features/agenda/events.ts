// Eventos de la agenda. Se suman a la unión EventBody de src/domain/events.ts.

import type { AgendaDef, AgendaPatch } from "./model";

export type AgendaEventBody =
  | { type: "agenda_created"; entry: AgendaDef }
  | { type: "agenda_updated"; entryId: string; patch: AgendaPatch }
  // Quita un solo día de un bloque que se repite («solo este día»): un delta, para que dos equipos sumen.
  | { type: "agenda_skipped"; entryId: string; date: string }
  | { type: "agenda_deleted"; entryId: string };

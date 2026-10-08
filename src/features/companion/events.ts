// Eventos del compañero de «Mi día». Se suman a la unión EventBody de src/domain/events.ts.

import type { CompanionLine } from "./model";

export type CompanionEventBody =
  /** Elige el compañero; sin `characterId`, vuelve a ser el personaje de hoy del menú. */
  | { type: "companion_chosen"; characterId?: string | null }
  | { type: "companion_line_added"; line: CompanionLine }
  | { type: "companion_line_updated"; lineId: string; text: string }
  | { type: "companion_line_removed"; lineId: string };

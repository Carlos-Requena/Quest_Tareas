// Eventos de los encargos temporales. Se suman a la unión EventBody de src/domain/events.ts.
// Los adjuntos y las quests enlazadas tienen sus propios eventos (deltas): si dos
// dispositivos adjuntan archivos o enlazan quests a la vez, se suman en vez de pisarse.

import type { AttachmentRef, TemporalDef, TemporalPatch, TemporalReward } from "./model";

export type TemporalEventBody =
  | { type: "temporal_created"; temporal: TemporalDef }
  | { type: "temporal_updated"; temporalId: string; patch: TemporalPatch }
  | { type: "temporal_attached"; temporalId: string; attachment: AttachmentRef }
  | { type: "temporal_detached"; temporalId: string; attachmentId: string }
  // Quests enlazadas, también como deltas: hay que terminarlas todas para cumplir el encargo.
  | { type: "temporal_linked"; temporalId: string; questId: string }
  | { type: "temporal_unlinked"; temporalId: string; questId: string }
  // Aceptar un encargo saca sus quests de la reserva al Quest Board; aplazarlo las devuelve.
  | { type: "temporal_accepted"; temporalId: string }
  | { type: "temporal_postponed"; temporalId: string }
  | {
      type: "temporal_completed";
      temporalId: string;
      /** Copia de la recompensa: editar el encargo después no cambia lo ganado. */
      reward: TemporalReward;
    }
  | { type: "temporal_deleted"; temporalId: string };

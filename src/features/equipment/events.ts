// Eventos del equipo. Se suman a la unión EventBody de src/domain/events.ts.
// Ponerse algo se sincroniza: el muñeco se ve igual en todos los equipos.

import type { GearSlot } from "../merchant/model";

export type EquipmentEventBody =
  | { type: "gear_equipped"; gearId: string }
  | { type: "gear_unequipped"; slot: GearSlot };

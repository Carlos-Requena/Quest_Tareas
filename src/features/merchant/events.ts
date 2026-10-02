// Eventos del mercader. Se suman a la unión EventBody de src/domain/events.ts.
// El precio viaja en `gear_purchased`: si Hu Tao cambia sus precios, lo ya pagado no cambia.

import type { GearDef, GearPatch } from "./model";

export type MerchantEventBody =
  | { type: "gear_created"; gear: GearDef }
  | { type: "gear_updated"; gearId: string; patch: GearPatch }
  | { type: "gear_deleted"; gearId: string }
  | { type: "gear_purchased"; gearId: string; price: number };

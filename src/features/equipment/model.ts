// Modelo puro del equipo: qué lleva puesto el muñeco y qué decoración tiene el menú.
// Sin React, sin store, sin Tauri, sin DOM. El dominio importa SOLO model.ts y events.ts.

import { gearOf, isGearSlot, starsOf, type GearDef, type GearSlot, type MerchantAcc } from "../merchant/model";
import type { EquipmentEventBody } from "./events";

/** Lo puesto en cada ranura (armadura y decoración), por id de pieza. */
export type Equipped = Partial<Record<GearSlot, string>>;

/** Acumulador que usa project() mientras reproduce los eventos. */
export interface EquipmentAcc {
  equipped: Equipped;
}

export const newEquipmentAcc = (): EquipmentAcc => ({ equipped: {} });

/**
 * Aplica un evento del equipo. Solo se puede poner lo que es tuyo, y cada pieza va
 * en su ranura: ponerte otra quita la anterior.
 */
export function applyEquipmentEvent(acc: EquipmentAcc, merchant: MerchantAcc, e: EquipmentEventBody) {
  switch (e.type) {
    case "gear_equipped": {
      const g = gearOf(merchant, e.gearId);
      if (g && merchant.owned[g.id]) acc.equipped[g.slot] = g.id;
      break;
    }
    case "gear_unequipped":
      if (isGearSlot(e.slot)) delete acc.equipped[e.slot];
      break;
  }
}

/**
 * Tras editar o retirar una pieza del catálogo: quita lo que ya no se puede llevar
 * (retirada, que ya no es tuya o que ha cambiado de ranura).
 */
export function pruneEquipment(acc: EquipmentAcc, merchant: MerchantAcc) {
  for (const slot of Object.keys(acc.equipped) as GearSlot[]) {
    const id = acc.equipped[slot]!;
    const g = gearOf(merchant, id);
    if (!g || !merchant.owned[id] || g.slot !== slot) delete acc.equipped[slot];
  }
}

/** La pieza puesta en una ranura, si existe. */
export function wornIn(equipped: Equipped, catalog: Map<string, GearDef>, slot: GearSlot): GearDef | undefined {
  const id = equipped[slot];
  return id ? catalog.get(id) : undefined;
}

/** Prestigio: estrellas de rareza de todo lo que llevas puesto (armadura y decoración). */
export function prestige(equipped: Equipped, catalog: Map<string, GearDef>): number {
  let n = 0;
  for (const id of Object.values(equipped)) {
    const g = id ? catalog.get(id) : undefined;
    if (g) n += starsOf(g);
  }
  return n;
}

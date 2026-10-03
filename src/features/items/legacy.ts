// Compatibilidad con la recompensa de objeto de la primera versión.
//
// v1: `RewardDef.item` era un texto libre («Poción de Vigor») y el inventario
//     contaba por nombre.
// v2: `RewardDef.itemId` apunta a un objeto del almanaque (`ItemDef`).
//
// Los eventos son inmutables, así que no se reescriben: al leerlos, cada nombre
// antiguo se convierte en un objeto común con un id estable derivado del nombre,
// el mismo en todos los dispositivos.

import type { RewardDef } from "../../domain/types";
import type { ItemDef } from "./model";

export type RewardV1 = RewardDef & { item?: string };

export const legacyItemId = (name: string) => `legacy:${name}`;

/** Objeto generado para un nombre antiguo. No sale en drops aleatorios: era una recompensa fija. */
export const legacyItem = (name: string, ts: number): ItemDef => ({
  id: legacyItemId(name),
  name,
  rarity: "common",
  kind: "other",
  description: "",
  droppable: false,
  createdAt: ts,
});

/** v1 → v2: `item` (texto) pasa a `itemId`. Devuelve también el objeto a registrar, si lo hay. */
export function upcastReward(r: RewardV1, ts: number): { reward: RewardDef; item?: ItemDef } {
  const { item, ...rest } = r;
  const name = item?.trim();
  if (rest.itemId || !name) return { reward: rest };
  return { reward: { ...rest, itemId: legacyItemId(name) }, item: legacyItem(name, ts) };
}

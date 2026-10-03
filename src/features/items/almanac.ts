// Almanaques: un libro por tipo de objeto del juego. Los objetos del almanaque
// (coleccionables de cofre y objetos de quest) y el equipo de Hu Tao (armaduras,
// fondos y emblemas). Solo sirve para ver lo que llevas: no cambia nada del juego.
//
// Puro, pero NO es model.ts: importa el modelo del mercader, que a su vez importa
// items/model.ts, y el dominio no debe ver ese ciclo. Solo lo usa la interfaz.

import { RARITIES, isCollectible, sortItems, type ItemDef, type Rarity } from "./model";
import { isDecorSlot, sortGear, type GearDef, type Purchase } from "../merchant/model";

/** Un almanaque por tipo de objeto, en el orden del índice del libro. */
export const ALMANACS = ["chest", "quest", "armor", "backdrop", "emblem"] as const;
export type Almanac = (typeof ALMANACS)[number];

/** Un cromo del almanaque: un objeto o una pieza de equipo. `key` no se repite entre los dos. */
export type AlmanacEntry = { kind: "item"; key: string; item: ItemDef } | { kind: "gear"; key: string; gear: GearDef };

export const itemKey = (id: string) => `item:${id}`;
export const gearKey = (id: string) => `gear:${id}`;

/** El almanaque al que pertenece cada cosa. */
export const almanacOfItem = (i: ItemDef): Almanac => (isCollectible(i) ? "chest" : "quest");
export const almanacOfGear = (g: GearDef): Almanac => (!isDecorSlot(g.slot) ? "armor" : g.slot === "backdrop" ? "backdrop" : "emblem");

/**
 * Los cromos de un almanaque, ya ordenados: los objetos de mayor a menor rareza;
 * el equipo por ranura (como en el muñeco) y, dentro, de mayor a menor rareza.
 */
export function almanacEntries(a: Almanac, items: Iterable<ItemDef>, gear: Iterable<GearDef>): AlmanacEntry[] {
  if (a === "chest" || a === "quest")
    return sortItems([...items].filter((i) => almanacOfItem(i) === a)).map((item) => ({ kind: "item", key: itemKey(item.id), item }));
  return sortGear([...gear].filter((g) => almanacOfGear(g) === a)).map((g) => ({ kind: "gear", key: gearKey(g.id), gear: g }));
}

export const entryRarity = (e: AlmanacEntry): Rarity => (e.kind === "item" ? e.item.rarity : e.gear.rarity);

/** Conseguido: el objeto está en el inventario, o la pieza se compró a Hu Tao. */
export const entryOwned = (e: AlmanacEntry, p: { inventory: Record<string, number>; owned: Record<string, Purchase> }) =>
  e.kind === "item" ? (p.inventory[e.item.id] ?? 0) > 0 : !!p.owned[e.gear.id];

/** Conseguidos y existentes de una lista, en total y por rareza (de mayor a menor). */
export function almanacProgress(entries: AlmanacEntry[], owned: (e: AlmanacEntry) => boolean) {
  const byRarity = [...RARITIES].reverse().map((r) => {
    const group = entries.filter((e) => entryRarity(e) === r);
    return { rarity: r, got: group.filter(owned).length, total: group.length };
  });
  return { got: entries.filter(owned).length, total: entries.length, byRarity };
}

/** El almanaque se ve en el índice: los coleccionables siempre; los demás, si tienen algo. */
export const almanacVisible = (a: Almanac, count: number) => a === "chest" || count > 0;


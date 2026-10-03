// Modelo puro del coleccionable de la semana: sin React, sin store, sin Tauri, sin DOM.
// El dominio (src/domain) importa SOLO model.ts y events.ts, nunca index.ts.
//
// Los coleccionables son los objetos que salen en los cofres (features/items). Si uno
// no te sale, Hu Tao lo vende: cada semana trae UNO, de rareza mítica o superior y que
// no tengas, elegido al azar con la semana como semilla (como su escaparate). Si lo
// compras, queda vendido hasta el lunes. Si te sale en un cofre antes, lo cambia por
// otro esa misma semana. Todo se calcula con la hora, sin eventos de «reposición»:
// todos los equipos ven la misma oferta.

import { isCollectible, rarityTier, type ItemDef, type ItemsAcc, type Rarity } from "../items/model";
import { PRICES, nextWeekStart, shopRound, weekKey, weekStart } from "../merchant/model";
import type { CollectibleEventBody } from "./events";

/** Rareza mínima de lo que se vende. */
export const OFFER_MIN_RARITY: Rarity = "mythic";

/** Recargo sobre el precio de una pieza de equipo de la misma rareza, por no haberlo sacado del cofre. */
export const COLLECTIBLE_SURCHARGE = 1.5;

/** Precio de un coleccionable: 68.000 G si es mítico y 150.000 G si es legendario. */
export const collectiblePrice = (r: Rarity) => shopRound(PRICES[r] * COLLECTIBLE_SURCHARGE);

/** Se puede ofrecer: coleccionable, mítico o superior, y no lo tienes. */
export const offerable = (i: ItemDef, inventory: Record<string, number>) =>
  isCollectible(i) && rarityTier(i.rarity) >= rarityTier(OFFER_MIN_RARITY) && !((inventory[i.id] ?? 0) > 0);

/** FNV-1a de 32 bits: un orden que parece al azar pero es el mismo en todos los equipos. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** La oferta de la semana. */
export interface CollectibleOffer {
  /** El coleccionable de esta semana (el vendido, si ya lo compraste). */
  item?: ItemDef;
  /** Ya compraste el de esta semana: no hay otro hasta el lunes. */
  sold: boolean;
  /** Cuándo cambia: el lunes siguiente. */
  endsAt: number;
}

/**
 * Lo que vende Hu Tao esta semana. Si ya compraste uno esta semana, ese, vendido.
 * Si no, el primero que no tienes en el orden de la semana: conseguir otro
 * coleccionable no la cambia, y sacar el ofrecido de un cofre pasa al siguiente.
 */
export function collectibleOffer(
  catalog: Iterable<ItemDef>,
  inventory: Record<string, number>,
  bought: Record<string, number>,
  now: number,
): CollectibleOffer {
  const from = weekStart(now);
  const endsAt = nextWeekStart(now);
  const items = [...catalog];
  // El último comprado esta semana (dos equipos sin conexión podrían haber comprado dos).
  let thisWeek: ItemDef | undefined;
  for (const i of items) {
    const at = bought[i.id];
    if (at !== undefined && at >= from && at < endsAt && (!thisWeek || at > bought[thisWeek.id])) thisWeek = i;
  }
  if (thisWeek) return { item: thisWeek, sold: true, endsAt };
  const key = weekKey(from);
  let best: ItemDef | undefined;
  let bestKey = 0;
  for (const i of items) {
    if (!offerable(i, inventory)) continue;
    const k = hash(`${key}:${i.id}`);
    if (!best || k < bestKey || (k === bestKey && i.id < best.id)) {
      best = i;
      bestKey = k;
    }
  }
  return { item: best, sold: false, endsAt };
}

/** Por qué no se puede comprar (en este orden). */
export type OfferBlocker = "missing" | "owned" | "soldOut" | "away" | "gold";

/**
 * Comprueba una compra. La proyección solo vuelve a mirar lo que no puede cambiar al
 * fusionar dispositivos (que sea un coleccionable mítico o superior, que no lo tengas
 * y que llegue el oro); que sea la oferta de esta semana se comprueba aquí, como el
 * escaparate del mercader.
 */
export function offerBlocker(
  item: ItemDef | undefined,
  offer: CollectibleOffer,
  p: { gold: number; inventory: Record<string, number> },
): OfferBlocker | undefined {
  if (!item) return "missing";
  if ((p.inventory[item.id] ?? 0) > 0) return "owned";
  if (offer.sold) return "soldOut";
  if (offer.item?.id !== item.id) return "away";
  if (p.gold < collectiblePrice(item.rarity)) return "gold";
  return undefined;
}

/**
 * Aplica una compra sobre el acumulador de los objetos. Devuelve el oro gastado, o
 * `undefined` si no cuenta. Si dos dispositivos gastan el mismo oro sin conexión, solo
 * vale la primera.
 */
export function applyCollectibleEvent(items: ItemsAcc, e: CollectibleEventBody, ts: number, gold: number): number | undefined {
  const def = items.catalog.get(e.itemId);
  const ok =
    !!def &&
    isCollectible(def) &&
    rarityTier(def.rarity) >= rarityTier(OFFER_MIN_RARITY) &&
    !((items.inventory[def.id] ?? 0) > 0) &&
    Number.isFinite(e.price) &&
    e.price >= 0 &&
    gold >= e.price;
  if (!ok) return undefined;
  items.inventory[def.id] = 1;
  items.discovered[def.id] ??= ts;
  items.bought[def.id] = ts;
  return e.price;
}

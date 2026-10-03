// Modelo puro del mercader: catálogo de equipo y decoración, precios, escaparate
// semanal y compras. Sin React, sin store, sin Tauri, sin DOM.
// El dominio (src/domain) importa SOLO model.ts y events.ts, nunca index.ts.

import { rankFor } from "../../domain/leveling";
import { seededRandom } from "../../lib/id";
import { RARITIES, RARITY_META, type Rarity } from "../items/model";
import type { MerchantEventBody } from "./events";
import { BUILTIN_GEAR } from "../armory/model";

// ───────────── Ranuras ─────────────

/** Piezas que lleva puestas el muñeco del personaje (features/equipment). */
export const ARMOR_SLOTS = ["head", "body", "hands", "feet", "weapon", "shield", "cape", "amulet"] as const;
/** Decoración del menú: cambia el aspecto de la app, no el del muñeco. */
export const DECOR_SLOTS = ["backdrop", "emblem"] as const;
export const GEAR_SLOTS = [...ARMOR_SLOTS, ...DECOR_SLOTS] as const;

export type ArmorSlot = (typeof ARMOR_SLOTS)[number];
export type DecorSlot = (typeof DECOR_SLOTS)[number];
export type GearSlot = (typeof GEAR_SLOTS)[number];

export const isGearSlot = (s: unknown): s is GearSlot => (GEAR_SLOTS as readonly unknown[]).includes(s);
export const isDecorSlot = (s: GearSlot): s is DecorSlot => (DECOR_SLOTS as readonly string[]).includes(s);
/** El fondo se ve a pantalla completa: su imagen se guarda también a tamaño grande (almacén de binarios). */
export const needsArt = (s: GearSlot) => s === "backdrop";

// ───────────── Equipo ─────────────

/** Imagen a tamaño grande en el almacén de binarios (src/storage/blobStore.ts). En el evento, solo la referencia. */
export interface GearArt {
  blobId: string;
  mime: string;
  size: number;
}

/** Una pieza del catálogo del mercader: armadura para el muñeco o decoración del menú. */
export interface GearDef {
  id: string;
  name: string;
  slot: GearSlot;
  rarity: Rarity;
  description: string;
  /** Icono reducido como data URL (160 px), como los objetos. Sin imagen se pinta el glifo de la ranura. */
  image?: string;
  /** Solo el fondo: la imagen grande, para pintarla detrás de la app. */
  art?: GearArt;
  createdAt: number;
}

/** Campos editables. `image: ""` quita la imagen y `art: null`, la imagen grande (JSON no guarda `undefined`). */
export type GearPatch = Partial<Omit<GearDef, "id" | "createdAt" | "art">> & { art?: GearArt | null };

export const GEAR_LIMITS = { name: 40, description: 240 } as const;

/** Lo que pagó el jugador y cuándo: copiado del evento, no cambia si luego suben los precios. */
export interface Purchase {
  at: number;
  price: number;
}

// ───────────── Precios y requisitos (los pone Hu Tao, no el jugador) ─────────────

/**
 * Precio base de cada rareza, en oro. Con el oro de features/rewards (un día bueno da
 * unos 6.500 G), lo común se compra en un día, lo raro en uno o dos, y lo legendario en
 * dos o tres semanas; el catálogo de serie entero, en un año.
 */
export const PRICES: Record<Rarity, number> = {
  common: 1_200,
  uncommon: 3_000,
  rare: 8_000,
  epic: 20_000,
  mythic: 45_000,
  legendary: 100_000,
};

/**
 * Recargo por ranura: lo que más se ve cuesta más. Nunca baja del precio base.
 * Un arma legendaria cuesta 150.000 G y un fondo legendario, 160.000 G.
 */
export const SLOT_PRICE_FACTOR: Record<GearSlot, number> = {
  head: 1.1,
  body: 1.4,
  hands: 1,
  feet: 1,
  weapon: 1.5,
  shield: 1.2,
  cape: 1.2,
  amulet: 1.3,
  backdrop: 1.6,
  emblem: 1.25,
};

/** Redondeo «de tienda»: a la centena por debajo de 10.000 y al millar por encima. */
const shopRound = (n: number) => (n < 10_000 ? Math.round(n / 100) * 100 : Math.round(n / 1000) * 1000);

/** Nivel mínimo para comprar cada rareza: el primero de cada rango (F, E, D, C, B y A). */
export const LEVEL_REQUIRED: Record<Rarity, number> = {
  common: 1,
  uncommon: 3,
  rare: 5,
  epic: 8,
  mythic: 12,
  legendary: 17,
};

export const priceOf = (g: Pick<GearDef, "rarity" | "slot">) =>
  shopRound(PRICES[g.rarity] * (SLOT_PRICE_FACTOR[g.slot] ?? 1));
export const levelRequired = (g: Pick<GearDef, "rarity">) => LEVEL_REQUIRED[g.rarity];
export const rankRequired = (g: Pick<GearDef, "rarity">) => rankFor(levelRequired(g));

// ───────────── Escaparate semanal ─────────────

/** Piezas que Hu Tao saca cada semana, sin contar los recién llegados. */
export const SHOWCASE_SIZE = 5;
/** Días que una pieza nueva está siempre a la venta, para verla nada más añadirla. */
export const NEW_ARRIVAL_DAYS = 7;
const DAY = 86_400_000;

/** Lunes a las 00:00 (hora local) de la semana de `now`. */
export function weekStart(now: number): number {
  const d = new Date(now);
  const back = (d.getDay() + 6) % 7; // lunes = 0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - back).getTime();
}

/** El lunes siguiente a las 00:00. Con fechas locales, una semana con cambio de hora dura lo que tenga que durar. */
export function nextWeekStart(now: number): number {
  const d = new Date(weekStart(now));
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7).getTime();
}

const weekKey = (ws: number) => {
  const d = new Date(ws);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

/** Recién llegada: lleva menos de NEW_ARRIVAL_DAYS en el catálogo (o viene de un reloj adelantado). */
export const isNewArrival = (g: Pick<GearDef, "createdAt">, now: number) => now - g.createdAt < NEW_ARRIVAL_DAYS * DAY;

export interface Showcase {
  /** Piezas a la venta esta semana. */
  ids: Set<string>;
  /** Las que están por ser recién llegadas (no ocupan sitio en el escaparate). */
  fresh: Set<string>;
  /** Cuándo cambia: el lunes siguiente. */
  endsAt: number;
}

/**
 * Lo que se vende esta semana: las recién llegadas y SHOWCASE_SIZE piezas más,
 * elegidas al azar con la semana como semilla. Se calcula con la hora, sin eventos:
 * todos los equipos ven el mismo escaparate y cambia solo, cada lunes.
 * Lo que ya es tuyo no se vende; si compras algo, otra pieza ocupa su sitio.
 */
export function showcase(catalog: Iterable<GearDef>, owned: Record<string, Purchase>, now: number): Showcase {
  const key = weekKey(weekStart(now));
  const forSale = [...catalog].filter((g) => !owned[g.id]);
  const fresh = new Set(forSale.filter((g) => isNewArrival(g, now)).map((g) => g.id));
  const picked = forSale
    .filter((g) => !fresh.has(g.id))
    .map((g) => ({ id: g.id, score: seededRandom(`${key}:${g.id}`)() }))
    .sort((a, b) => a.score - b.score || (a.id < b.id ? -1 : 1))
    .slice(0, SHOWCASE_SIZE)
    .map((s) => s.id);
  return { ids: new Set([...fresh, ...picked]), fresh, endsAt: nextWeekStart(now) };
}

/**
 * Primera semana futura en la que la pieza volverá al escaparate, si el catálogo no
 * cambia (añadir o comprar piezas lo cambia). `undefined` si no sale en `maxWeeks`.
 */
export function nextShowing(id: string, catalog: GearDef[], owned: Record<string, Purchase>, now: number, maxWeeks = 26): number | undefined {
  let t = nextWeekStart(now);
  for (let i = 0; i < maxWeeks; i++) {
    if (showcase(catalog, owned, t).ids.has(id)) return t;
    t = nextWeekStart(t);
  }
  return undefined;
}

// ───────────── Comprar ─────────────

/** Por qué no se puede comprar una pieza (en este orden). */
export type BuyBlocker = "missing" | "owned" | "away" | "rank" | "gold";

/**
 * Comprueba una compra con las reglas de Hu Tao. La proyección solo vuelve a mirar
 * lo que no puede cambiar al fusionar dispositivos (que exista, que no sea tuya y que
 * llegue el oro); el escaparate y el rango se comprueban aquí, como los huecos al aceptar.
 */
export function buyBlocker(
  g: GearDef | undefined,
  p: { level: number; gold: number; owned: Record<string, Purchase> },
  onSale: boolean,
): BuyBlocker | undefined {
  if (!g) return "missing";
  if (p.owned[g.id]) return "owned";
  if (!onSale) return "away";
  if (p.level < levelRequired(g)) return "rank";
  if (p.gold < priceOf(g)) return "gold";
  return undefined;
}

// ───────────── Proyección: catálogo y compras ─────────────

/** Acumulador que usa project() mientras reproduce los eventos. */
export interface MerchantAcc {
  /** Piezas añadidas por el jugador. Las de serie no van aquí (ni en el snapshot): ver gearOf. */
  catalog: Map<string, GearDef>;
  /** Ids retirados: un evento repetido no los resucita. */
  deleted: Set<string>;
  /** Piezas compradas, por id. */
  owned: Record<string, Purchase>;
}

export const newMerchantAcc = (): MerchantAcc => ({ catalog: new Map(), deleted: new Set(), owned: {} });

const validGear = (g: GearDef | undefined): g is GearDef =>
  !!g && typeof g.id === "string" && isGearSlot(g.slot) && RARITIES.includes(g.rarity);

/**
 * Aplica un evento del mercader. Devuelve el oro gastado (0 si no hubo compra).
 * Las guardas ignoran los imposibles, igual que project().
 */
export function applyMerchantEvent(acc: MerchantAcc, e: MerchantEventBody, ts: number, gold: number): number {
  switch (e.type) {
    case "gear_created":
      // Las piezas de serie (armory) no se pueden crear, editar ni retirar con eventos.
      if (validGear(e.gear) && !BUILTIN_GEAR.has(e.gear.id) && !acc.catalog.has(e.gear.id) && !acc.deleted.has(e.gear.id))
        acc.catalog.set(e.gear.id, e.gear);
      return 0;

    case "gear_updated": {
      const cur = acc.catalog.get(e.gearId);
      if (!cur) return 0;
      // Parche por campos: dos dispositivos que editan campos distintos no se pisan.
      const { art, ...patch } = e.patch ?? {};
      if (patch.slot !== undefined && !isGearSlot(patch.slot)) delete patch.slot;
      if (patch.rarity !== undefined && !RARITIES.includes(patch.rarity)) delete patch.rarity;
      const next: GearDef = { ...cur, ...patch, id: cur.id, createdAt: cur.createdAt };
      if (art === null) delete next.art;
      else if (art) next.art = art;
      acc.catalog.set(cur.id, next);
      return 0;
    }

    case "gear_deleted":
      if (acc.catalog.delete(e.gearId)) {
        acc.deleted.add(e.gearId);
        delete acc.owned[e.gearId];
      }
      return 0;

    case "gear_purchased": {
      // Si dos dispositivos gastan el mismo oro sin conexión, solo vale la compra que llega primero.
      const ok =
        !!gearOf(acc, e.gearId) && !acc.owned[e.gearId] && Number.isFinite(e.price) && e.price >= 0 && gold >= e.price;
      if (!ok) return 0;
      acc.owned[e.gearId] = { at: ts, price: e.price };
      return e.price;
    }
  }
}

/** Una pieza del catálogo: del jugador o de serie (features/armory). */
export const gearOf = (acc: Pick<MerchantAcc, "catalog">, id: string): GearDef | undefined =>
  acc.catalog.get(id) ?? BUILTIN_GEAR.get(id);

/** El catálogo entero: las piezas de serie y, después, las que ha añadido el jugador. */
export const fullCatalog = (acc: Pick<MerchantAcc, "catalog">): Map<string, GearDef> => new Map([...BUILTIN_GEAR, ...acc.catalog]);

/** Binarios que usa el catálogo (para no borrarlos al limpiar el almacén). */
export function gearBlobIds(catalog: Iterable<GearDef>): Set<string> {
  const ids = new Set<string>();
  for (const g of catalog) if (g.art?.blobId) ids.add(g.art.blobId);
  return ids;
}

// ───────────── Vistas ─────────────

/** Orden del catálogo: por ranura (como en el muñeco) y, dentro, de mayor a menor rareza. */
export function sortGear(gear: Iterable<GearDef>): GearDef[] {
  const slot = (g: GearDef) => GEAR_SLOTS.indexOf(g.slot);
  return [...gear].sort(
    (a, b) =>
      slot(a) - slot(b) ||
      RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity) ||
      a.createdAt - b.createdAt ||
      (a.id < b.id ? -1 : 1),
  );
}

/** Estrellas de una pieza (1 común … 6 legendaria). */
export const starsOf = (g: Pick<GearDef, "rarity">) => RARITY_META[g.rarity].stars;

export const clampText = (s: string, max: number) => s.trim().slice(0, max);

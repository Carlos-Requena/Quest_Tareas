// Modelo puro de los objetos: sin React, sin store, sin Tauri, sin DOM.
// El dominio (src/domain) importa SOLO model.ts, events.ts y legacy.ts, nunca index.ts.

import type { Category } from "../../domain/types";
import type { ItemEventBody } from "./events";

// ───────────── Rarezas ─────────────

/** De menor a mayor: el índice es el «nivel» de la rareza. */
export const RARITIES = ["common", "uncommon", "rare", "epic", "mythic", "legendary"] as const;
export type Rarity = (typeof RARITIES)[number];

export const rarityTier = (r: Rarity) => RARITIES.indexOf(r);

/** Presentación de cada rareza. El nombre traducido está en el diccionario (`items.rarity.*`). */
export const RARITY_META: Record<Rarity, { stars: number; color: string; tag: string }> = {
  common: { stars: 1, color: "var(--r-common)", tag: "COMMON" },
  uncommon: { stars: 2, color: "var(--r-uncommon)", tag: "UNCOMMON" },
  rare: { stars: 3, color: "var(--r-rare)", tag: "RARE" },
  epic: { stars: 4, color: "var(--r-epic)", tag: "EPIC" },
  mythic: { stars: 5, color: "var(--r-mythic)", tag: "MYTHIC" },
  legendary: { stars: 6, color: "var(--r-legendary)", tag: "LEGENDARY" },
};

// ───────────── Tipos de objeto ─────────────

/** Tipos fijos de los objetos (se ven en su ficha). El nombre traducido está en `items.kinds.*`. */
export const ITEM_KINDS = ["consumable", "material", "accessory", "relic", "tome", "trophy", "treasure", "other"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const isItemKind = (k: unknown): k is ItemKind => ITEM_KINDS.includes(k as ItemKind);

/** Icono de cada tipo. */
export const KIND_GLYPH: Record<ItemKind, string> = {
  consumable: "⚗",
  material: "◇",
  accessory: "◎",
  relic: "✠",
  tome: "❦",
  trophy: "♛",
  treasure: "✦",
  other: "·",
};

/**
 * Palabras con las que se escribía el tipo cuando era texto libre (es, ja, en).
 * Los objetos antiguos se clasifican al leerlos; lo que no encaja va a «other».
 */
const KIND_WORDS: [ItemKind, string[]][] = [
  ["consumable", ["consumible", "pocion", "elixir", "comida", "bebida", "消耗品", "ポーション", "薬", "consumable", "potion", "food"]],
  ["material", ["material", "mineral", "gema", "cristal", "pluma", "escama", "素材", "鉱石", "gem", "crystal", "ore"]],
  ["accessory", ["accesorio", "anillo", "amuleto", "colgante", "joya", "装飾品", "指輪", "アクセサリー", "accessory", "ring", "amulet", "jewel"]],
  ["relic", ["reliquia", "artefacto", "sello", "reloj", "遺物", "アーティファクト", "relic", "artifact"]],
  ["tome", ["grimorio", "libro", "tomo", "pergamino", "mapa", "魔導書", "書", "巻物", "grimoire", "book", "tome", "scroll"]],
  ["trophy", ["trofeo", "medalla", "insignia", "戦利品", "トロフィー", "勲章", "trophy", "medal", "badge"]],
  ["treasure", ["tesoro", "corona", "oro", "財宝", "宝", "treasure", "crown"]],
];

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Tipo fijo de un objeto: el que trae o, si es un texto libre antiguo, el que mejor encaja. */
export function itemKindOf(raw: unknown): ItemKind {
  if (isItemKind(raw)) return raw;
  const text = typeof raw === "string" ? fold(raw) : "";
  if (!text) return "other";
  for (const [kind, words] of KIND_WORDS) if (words.some((w) => text.includes(fold(w)))) return kind;
  return "other";
}

// ───────────── Objeto ─────────────

/** Definición de un objeto del almanaque (lo que se crea desde la app). */
export interface ItemDef {
  id: string;
  name: string;
  rarity: Rarity;
  /** Tipo fijo (sección del almanaque). Los objetos antiguos traían texto libre: ver itemKindOf. */
  kind: ItemKind;
  description: string;
  /** Imagen reducida como data URL (ver image.ts). Sin imagen se pinta un monograma. */
  image?: string;
  /**
   * Si puede salir en los cofres. Los que salen son **coleccionables**: se tienen o no
   * se tienen (un repetido se quema). Los que no, solo como recompensa fija de una quest.
   */
  droppable: boolean;
  createdAt: number;
}

/** Campos editables de un objeto. */
export type ItemPatch = Partial<Omit<ItemDef, "id" | "createdAt">>;

export const ITEM_LIMITS = { name: 40, description: 240 } as const;

/** Coleccionable: un objeto que sale en los cofres. Solo se puede tener uno. */
export const isCollectible = (i: Pick<ItemDef, "droppable">) => i.droppable;

/** Un objeto obtenido en un drop. La rareza se copia: el pity no cambia si luego se edita el objeto. */
export interface Drop {
  itemId: string;
  rarity: Rarity;
}

// ───────────── Tablas de drop (inspiradas en Genshin Impact) ─────────────

export type DropTableId = "standard" | "elite";

export interface DropTable {
  /** Tiradas por quest completada. */
  rolls: number;
  /** Probabilidad base de cada rareza, en %. Suman 100. */
  weights: Record<Rarity, number>;
}

/**
 * La estándar calca Genshin en los extremos: legendario 0,6 % (el 5★) y épico o
 * superior ~9 % (el 4★ es 5,1 %; aquí hay dos rarezas intermedias más).
 * Las quests de élite tiran dos veces con una tabla mejorada (legendario ×3,3).
 */
export const DROP_TABLES: Record<DropTableId, DropTable> = {
  standard: {
    rolls: 1,
    weights: { common: 50, uncommon: 28, rare: 13, epic: 6, mythic: 2.4, legendary: 0.6 },
  },
  elite: {
    rolls: 2,
    weights: { common: 30, uncommon: 30, rare: 20, epic: 12, mythic: 6, legendary: 2 },
  },
};

export const dropTableFor = (c: Category): DropTableId => (c === "elite" ? "elite" : "standard");

/**
 * Pity («compasión»), como en Genshin:
 * - Legendario: desde la tirada 74 sin legendario, +6 % por tirada; la 90 lo garantiza.
 * - Épico o superior: garantizado cada 10 tiradas.
 */
export const PITY_RULES = {
  legendary: { soft: 74, hard: 90, step: 6 },
  epic: { hard: 10 },
} as const;

/** Tiradas desde el último drop de cada umbral. Se calcula reproduciendo los drops. */
export interface Pity {
  sinceLegendary: number;
  sinceEpic: number;
}

export const newPity = (): Pity => ({ sinceLegendary: 0, sinceEpic: 0 });

export function advancePity(p: Pity, rarity: Rarity): Pity {
  return {
    sinceLegendary: rarity === "legendary" ? 0 : p.sinceLegendary + 1,
    sinceEpic: rarityTier(rarity) >= rarityTier("epic") ? 0 : p.sinceEpic + 1,
  };
}

/** Probabilidad (0–1) de legendario en la próxima tirada, con el pity actual. */
export function legendaryChance(table: DropTable, p: Pity): number {
  const n = p.sinceLegendary + 1; // número de esta tirada
  const { soft, hard, step } = PITY_RULES.legendary;
  if (n >= hard) return 1;
  return Math.min(1, (table.weights.legendary + Math.max(0, n - soft + 1) * step) / 100);
}

/** La próxima tirada garantiza épico o superior. */
export const epicGuaranteed = (p: Pity) => p.sinceEpic + 1 >= PITY_RULES.epic.hard;

/** Rareza de una tirada. `rnd` devuelve [0, 1): Math.random en la app, una semilla en las pruebas. */
export function rollRarity(table: DropTable, p: Pity, rnd: () => number): Rarity {
  if (rnd() < legendaryChance(table, p)) return "legendary";
  const minTier = epicGuaranteed(p) ? rarityTier("epic") : 0;
  const pool = RARITIES.filter((r) => r !== "legendary" && rarityTier(r) >= minTier);
  const total = pool.reduce((s, r) => s + table.weights[r], 0);
  let x = rnd() * total;
  for (const r of pool) {
    x -= table.weights[r];
    if (x < 0) return r;
  }
  return pool[pool.length - 1];
}

/**
 * Objeto de la rareza pedida. Si no hay ninguno de esa rareza en el almanaque,
 * baja a la siguiente rareza inferior que tenga objetos (y, si no hay, sube).
 */
export function pickItem(pool: ItemDef[], rarity: Rarity, rnd: () => number): ItemDef | undefined {
  const t = rarityTier(rarity);
  const order = [...RARITIES.slice(0, t + 1).reverse(), ...RARITIES.slice(t + 1)];
  for (const r of order) {
    const options = pool.filter((i) => i.rarity === r);
    if (options.length) return options[Math.floor(rnd() * options.length)];
  }
  return undefined;
}

/** Drops de una quest completada. Sin objetos que puedan salir, no hay drop. */
export function rollDrops(tableId: DropTableId, catalog: Iterable<ItemDef>, pity: Pity, rnd: () => number): Drop[] {
  const table = DROP_TABLES[tableId];
  const pool = [...catalog].filter((i) => i.droppable);
  if (!pool.length) return [];
  const out: Drop[] = [];
  let p = pity;
  for (let i = 0; i < table.rolls; i++) {
    const item = pickItem(pool, rollRarity(table, p, rnd), rnd);
    if (!item) break;
    out.push({ itemId: item.id, rarity: item.rarity });
    p = advancePity(p, item.rarity);
  }
  return out;
}

// ───────────── Proyección: catálogo, inventario y pity ─────────────

/** Acumulador que usa project() mientras reproduce los eventos. */
export interface ItemsAcc {
  catalog: Map<string, ItemDef>;
  /** Ids retirados: un evento repetido o un objeto antiguo no los resucita. */
  deleted: Set<string>;
  inventory: Record<string, number>;
  /** Primera vez que se obtuvo cada objeto (ms). */
  discovered: Record<string, number>;
  pity: Pity;
  /** Coleccionables comprados a Hu Tao: cuándo (ms), por id (features/collectibles). */
  bought: Record<string, number>;
}

export const newItemsAcc = (): ItemsAcc => ({
  catalog: new Map(),
  deleted: new Set(),
  inventory: {},
  discovered: {},
  pity: newPity(),
  bought: {},
});

/** Añade un objeto al almanaque si no existe ni fue retirado. El tipo se pasa a uno fijo. */
export function registerItem(acc: ItemsAcc, def: ItemDef) {
  if (!acc.catalog.has(def.id) && !acc.deleted.has(def.id)) acc.catalog.set(def.id, { ...def, kind: itemKindOf(def.kind) });
}

/** Aplica un evento de objeto. Las guardas ignoran los imposibles, igual que project(). */
export function applyItemEvent(acc: ItemsAcc, e: ItemEventBody) {
  switch (e.type) {
    case "item_created":
      registerItem(acc, e.item);
      break;
    case "item_updated": {
      const cur = acc.catalog.get(e.itemId);
      // Parche por campos: dos dispositivos que editan campos distintos no se pisan.
      if (!cur) break;
      const next = { ...cur, ...e.patch, id: cur.id, createdAt: cur.createdAt };
      if (e.patch.kind !== undefined) next.kind = itemKindOf(e.patch.kind);
      acc.catalog.set(cur.id, next);
      // Si pasa a salir en los cofres, es coleccionable: los repetidos se queman.
      if (isCollectible(next) && (acc.inventory[cur.id] ?? 0) > 1) acc.inventory[cur.id] = 1;
      break;
    }
    case "item_deleted":
      if (acc.catalog.delete(e.itemId)) {
        acc.deleted.add(e.itemId);
        delete acc.inventory[e.itemId];
        delete acc.discovered[e.itemId];
        delete acc.bought[e.itemId];
      }
      break;
  }
}

/**
 * Suma objetos al inventario (los retirados se ignoran) y avanza el pity con los drops.
 * Un coleccionable que ya tienes se quema: no suma, pero la tirada cuenta para el pity.
 */
export function receiveItems(acc: ItemsAcc, guaranteed: string | undefined, drops: Drop[], ts: number) {
  const add = (id: string) => {
    const def = acc.catalog.get(id);
    if (!def) return;
    if (isCollectible(def) && (acc.inventory[id] ?? 0) > 0) return;
    acc.inventory[id] = (acc.inventory[id] ?? 0) + 1;
    acc.discovered[id] ??= ts;
  };
  if (guaranteed) add(guaranteed);
  for (const d of drops) {
    add(d.itemId);
    acc.pity = advancePity(acc.pity, d.rarity);
  }
}

/** Orden del almanaque: de mayor a menor rareza y, dentro, por fecha de creación. */
export function sortItems(items: Iterable<ItemDef>): ItemDef[] {
  return [...items].sort((a, b) => rarityTier(b.rarity) - rarityTier(a.rarity) || a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1));
}

export const clampText = (s: string, max: number) => s.trim().slice(0, max);

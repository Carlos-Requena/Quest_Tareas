import { describe, expect, it } from "vitest";
import { project } from "../../domain/projection";
import type { EventBody } from "../../domain/events";
import { itemDef, questDef, withMeta } from "../../test/streams";
import type { ItemDef } from "../items/model";
import { collectibleOffer, collectiblePrice, offerBlocker } from "./model";

const DAY = 86_400_000;
/** Semana del lunes 5 al domingo 11 de octubre de 2026, hora local (vitest fija Europe/Madrid). */
const MON = new Date(2026, 9, 5, 0, 0).getTime();
const WED = new Date(2026, 9, 7, 18, 30).getTime();
const SUN = new Date(2026, 9, 11, 23, 59).getTime();
const NEXT_MON = new Date(2026, 9, 12, 0, 0).getTime();

const mythic = (id: string, extra: Partial<ItemDef> = {}) => itemDef(id, { rarity: "mythic", ...extra });
const legendary = (id: string) => itemDef(id, { rarity: "legendary" });

/** Una quest que da `gold` de oro (la recompensa va copiada en quest_completed) y, si se pide, un drop. */
function earn(id: string, gold: number, drop?: ItemDef): EventBody[] {
  return [
    { type: "quest_created", quest: questDef(id, { conditions: [] }) },
    { type: "quest_accepted", questId: id },
    { type: "quest_completed", questId: id, reward: { xp: 0, gold }, drops: drop ? [{ itemId: drop.id, rarity: drop.rarity }] : undefined },
  ];
}

describe("precio y oferta", () => {
  it("un 50 % más que el equipo de su rareza", () => {
    expect(collectiblePrice("mythic")).toBe(68_000);
    expect(collectiblePrice("legendary")).toBe(150_000);
  });

  it("solo coleccionables míticos o legendarios que no tienes, uno por semana y el mismo en todos los equipos", () => {
    const catalog = [itemDef("c", { rarity: "epic" }), mythic("fixed", { droppable: false }), mythic("m1"), mythic("m2"), legendary("l1")];
    const offer = collectibleOffer(catalog, {}, {}, MON);
    expect(["m1", "m2", "l1"]).toContain(offer.item?.id);
    expect(offer.sold).toBe(false);
    expect(offer.endsAt).toBe(NEXT_MON);
    // El orden no depende del orden del catálogo, y dura toda la semana.
    expect(collectibleOffer([...catalog].reverse(), {}, {}, MON).item?.id).toBe(offer.item?.id);
    expect(collectibleOffer(catalog, {}, {}, SUN).item?.id).toBe(offer.item?.id);
  });

  it("cambia de una semana a otra", () => {
    const catalog = Array.from({ length: 12 }, (_, i) => mythic(`m${i}`));
    const weeks = Array.from({ length: 8 }, (_, w) => collectibleOffer(catalog, {}, {}, MON + w * 7 * DAY).item?.id);
    expect(new Set(weeks).size).toBeGreaterThan(1);
  });

  it("si te sale en un cofre otro coleccionable no cambia; si te sale el ofrecido, trae otro esa semana", () => {
    const catalog = [mythic("m1"), mythic("m2"), legendary("l1"), itemDef("c")];
    const offer = collectibleOffer(catalog, {}, {}, MON).item!;
    const other = catalog.find((i) => i.id !== offer.id && i.rarity !== "common")!;
    expect(collectibleOffer(catalog, { [other.id]: 1, c: 1 }, {}, MON).item?.id).toBe(offer.id);
    const next = collectibleOffer(catalog, { [offer.id]: 1 }, {}, WED);
    expect(next.item).toBeDefined();
    expect(next.item?.id).not.toBe(offer.id);
    expect(next.sold).toBe(false);
    expect(collectibleOffer(catalog, { m1: 1, m2: 1, l1: 1 }, {}, MON).item).toBeUndefined();
  });

  it("comprado, queda vendido hasta el lunes", () => {
    const catalog = [mythic("m1"), mythic("m2"), legendary("l1")];
    const offer = collectibleOffer(catalog, {}, {}, MON).item!;
    const bought = { [offer.id]: WED };
    const sold = collectibleOffer(catalog, { [offer.id]: 1 }, bought, SUN);
    expect(sold).toMatchObject({ sold: true, item: { id: offer.id } });
    const nextWeek = collectibleOffer(catalog, { [offer.id]: 1 }, bought, NEXT_MON);
    expect(nextWeek.sold).toBe(false);
    expect(nextWeek.item?.id).not.toBe(offer.id);
  });

  it("dice por qué no se puede comprar (sin requisito de rango)", () => {
    const m = mythic("m");
    const onSale = { item: m, sold: false, endsAt: NEXT_MON };
    const rich = { gold: 1e6, inventory: {} };
    expect(offerBlocker(undefined, onSale, rich)).toBe("missing");
    expect(offerBlocker(m, onSale, { ...rich, inventory: { m: 1 } })).toBe("owned");
    expect(offerBlocker(m, { ...onSale, sold: true, item: mythic("otro") }, rich)).toBe("soldOut");
    expect(offerBlocker(m, { ...onSale, item: mythic("otro") }, rich)).toBe("away");
    expect(offerBlocker(m, onSale, { ...rich, gold: 67_999 })).toBe("gold");
    expect(offerBlocker(m, onSale, rich)).toBeUndefined();
  });
});

describe("compra en la proyección", () => {
  it("gasta el oro, lo añade a la colección y lo apunta en la crónica", () => {
    const st = project(withMeta([{ type: "item_created", item: mythic("m") }, ...earn("q", 70_000), { type: "collectible_purchased", itemId: "m", price: 68_000 }]));
    expect(st.player.gold).toBe(2_000);
    expect(st.player.inventory).toEqual({ m: 1 });
    expect(st.player.discovered.m).toBeDefined();
    expect(st.player.collectiblesBought.m).toBeDefined();
    expect(st.chronicle.entries[st.chronicle.entries.length - 1]).toMatchObject({ k: "purchase", collectible: true, gearId: "m", price: 68_000 });
  });

  it("sin oro suficiente, de algo que ya tienes, o que no es un coleccionable mítico, no cuenta", () => {
    const st = project(
      withMeta([
        { type: "item_created", item: mythic("m") },
        { type: "item_created", item: mythic("fixed", { droppable: false }) },
        { type: "item_created", item: itemDef("epic", { rarity: "epic" }) },
        { type: "collectible_purchased", itemId: "m", price: 68_000 },
        ...earn("q", 200_000),
        { type: "collectible_purchased", itemId: "fixed", price: 68_000 },
        { type: "collectible_purchased", itemId: "epic", price: 30_000 },
        { type: "collectible_purchased", itemId: "nada", price: 1 },
        { type: "collectible_purchased", itemId: "m", price: -5 },
      ]),
    );
    expect(st.player.gold).toBe(200_000);
    expect(st.player.inventory).toEqual({});
  });

  it("dos equipos que lo compran sin conexión solo pagan una vez", () => {
    const st = project(
      withMeta([
        { type: "item_created", item: mythic("m") },
        ...earn("q", 200_000),
        { type: "collectible_purchased", itemId: "m", price: 68_000 },
        { type: "collectible_purchased", itemId: "m", price: 68_000 },
      ]),
    );
    expect(st.player.gold).toBe(132_000);
    expect(st.chronicle.entries.filter((e) => e.k === "purchase")).toHaveLength(1);
  });

  it("si te sale en un cofre después de comprarlo, el repetido se quema", () => {
    const m = mythic("m");
    const st = project(withMeta([{ type: "item_created", item: m }, ...earn("q", 70_000), { type: "collectible_purchased", itemId: "m", price: 68_000 }, ...earn("q2", 0, m)]));
    expect(st.player.inventory).toEqual({ m: 1 });
  });

  it("si ya te salió en un cofre, comprarlo no cobra", () => {
    const m = mythic("m");
    const st = project(withMeta([{ type: "item_created", item: m }, ...earn("q", 70_000, m), { type: "collectible_purchased", itemId: "m", price: 68_000 }]));
    expect(st.player.gold).toBe(70_000);
  });
});

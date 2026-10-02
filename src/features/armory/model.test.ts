import { describe, expect, it } from "vitest";
import { RARITIES } from "../items/model";
import { GEAR_SLOTS, applyMerchantEvent, fullCatalog, gearOf, newMerchantAcc } from "../merchant/model";
import { applyEquipmentEvent, newEquipmentAcc, pruneEquipment } from "../equipment/model";
import { gearDef, T0 } from "../../test/streams";
import { ARMORY } from "./catalog";
import { armoryEs, armoryJa } from "./i18n";
import { ARMORY_PREFIX, BUILTIN_GEAR, armoryKey, builtinArt, isBuiltinGear } from "./model";

const SWORD = `${ARMORY_PREFIX}chunchunmaru`;

describe("catálogo de serie", () => {
  it("claves únicas, ranuras y rarezas válidas, y texto en los dos idiomas", () => {
    const keys = ARMORY.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const e of ARMORY) {
      expect(GEAR_SLOTS).toContain(e.slot);
      expect(RARITIES).toContain(e.rarity);
      const es = armoryEs.items[e.key as keyof typeof armoryEs.items];
      const ja = armoryJa.items[e.key as keyof typeof armoryJa.items];
      expect(es?.name, e.key).toBeTruthy();
      expect(es?.desc, e.key).toBeTruthy();
      expect(ja?.name, e.key).toBeTruthy();
      expect(ja?.desc, e.key).toBeTruthy();
    }
    // Ningún texto sobra (una pieza borrada del catálogo dejaría su texto huérfano).
    expect(Object.keys(armoryEs.items).sort()).toEqual([...keys].sort());
  });

  it("hay de todo: cada ranura tiene piezas y hay de las seis rarezas", () => {
    for (const slot of GEAR_SLOTS) expect(ARMORY.filter((e) => e.slot === slot).length, slot).toBeGreaterThanOrEqual(5);
    for (const r of RARITIES) expect(ARMORY.some((e) => e.rarity === r), r).toBe(true);
    expect(BUILTIN_GEAR.size).toBe(ARMORY.length);
  });

  it("cada pieza trae su icono en SVG, sin valores rotos", () => {
    for (const g of BUILTIN_GEAR.values()) {
      expect(g.image, g.id).toMatch(/^data:image\/svg\+xml/);
      const svg = decodeURIComponent(g.image!.split(",")[1]);
      expect(svg, g.id).toMatch(/^<svg [^>]*viewBox/);
      expect(svg, g.id).not.toMatch(/undefined|NaN|null/);
      expect(g.createdAt).toBe(0);
    }
    expect(builtinArt(`${ARMORY_PREFIX}crystal_star_sea`)).toMatch(/^data:image\/svg/);
    expect(builtinArt(SWORD)).toBeUndefined();
  });

  it("los ids de serie no chocan con los del jugador", () => {
    expect(isBuiltinGear(SWORD)).toBe(true);
    expect(armoryKey(SWORD)).toBe("chunchunmaru");
    expect(isBuiltinGear("chunchunmaru")).toBe(false);
    expect(armoryKey("otra")).toBeUndefined();
  });
});

describe("en la proyección", () => {
  it("están en el catálogo sin eventos y no van en el acumulador (ni en el snapshot)", () => {
    const acc = newMerchantAcc();
    expect(acc.catalog.size).toBe(0);
    expect(gearOf(acc, SWORD)?.slot).toBe("weapon");
    const all = fullCatalog(acc);
    expect(all.size).toBe(BUILTIN_GEAR.size);
    acc.catalog.set("mia", gearDef("mia"));
    expect(fullCatalog(acc).size).toBe(BUILTIN_GEAR.size + 1);
  });

  it("no se pueden crear, editar ni retirar con eventos", () => {
    const acc = newMerchantAcc();
    applyMerchantEvent(acc, { type: "gear_created", gear: gearDef(SWORD, { name: "Falsa" }) }, T0, 0);
    applyMerchantEvent(acc, { type: "gear_updated", gearId: SWORD, patch: { rarity: "legendary" } }, T0, 0);
    applyMerchantEvent(acc, { type: "gear_deleted", gearId: SWORD }, T0, 0);
    expect(acc.catalog.size).toBe(0);
    expect(acc.deleted.size).toBe(0);
    expect(gearOf(acc, SWORD)).toMatchObject({ rarity: "rare", name: "Chunchunmaru" });
  });

  it("se compran y se equipan como las demás, y retirar otra pieza no las quita", () => {
    const acc = newMerchantAcc();
    expect(applyMerchantEvent(acc, { type: "gear_purchased", gearId: SWORD, price: 12_000 }, T0, 11_999)).toBe(0);
    expect(applyMerchantEvent(acc, { type: "gear_purchased", gearId: SWORD, price: 12_000 }, T0, 12_000)).toBe(12_000);
    const eq = newEquipmentAcc();
    applyEquipmentEvent(eq, acc, { type: "gear_equipped", gearId: SWORD });
    expect(eq.equipped.weapon).toBe(SWORD);
    pruneEquipment(eq, acc);
    expect(eq.equipped.weapon).toBe(SWORD);
  });
});

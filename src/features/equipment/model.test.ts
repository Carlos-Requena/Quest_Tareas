import { describe, expect, it } from "vitest";
import { gearDef, T0 } from "../../test/streams";
import { applyMerchantEvent, newMerchantAcc, type GearDef } from "../merchant/model";
import { applyEquipmentEvent, newEquipmentAcc, prestige, pruneEquipment, wornIn } from "./model";

/** Catálogo con piezas compradas (o no) y un equipo vacío. */
function setup(pieces: { gear: GearDef; owned?: boolean }[]) {
  const merchant = newMerchantAcc();
  for (const { gear, owned } of pieces) {
    applyMerchantEvent(merchant, { type: "gear_created", gear }, T0, 0);
    if (owned) applyMerchantEvent(merchant, { type: "gear_purchased", gearId: gear.id, price: 0 }, T0, 0);
  }
  return { merchant, eq: newEquipmentAcc() };
}

describe("ponerse equipo", () => {
  it("solo lo que es tuyo, y en su ranura", () => {
    const { merchant, eq } = setup([
      { gear: gearDef("casco", { slot: "head" }), owned: true },
      { gear: gearDef("escudo", { slot: "shield" }) },
    ]);
    applyEquipmentEvent(eq, merchant, { type: "gear_equipped", gearId: "escudo" });
    applyEquipmentEvent(eq, merchant, { type: "gear_equipped", gearId: "nada" });
    applyEquipmentEvent(eq, merchant, { type: "gear_equipped", gearId: "casco" });
    expect(eq.equipped).toEqual({ head: "casco" });
    expect(wornIn(eq.equipped, merchant.catalog, "head")?.id).toBe("casco");
    expect(wornIn(eq.equipped, merchant.catalog, "shield")).toBeUndefined();
  });

  it("ponerse otra pieza de la misma ranura quita la anterior; quitar vacía la ranura", () => {
    const { merchant, eq } = setup([
      { gear: gearDef("a", { slot: "cape" }), owned: true },
      { gear: gearDef("b", { slot: "cape" }), owned: true },
    ]);
    applyEquipmentEvent(eq, merchant, { type: "gear_equipped", gearId: "a" });
    applyEquipmentEvent(eq, merchant, { type: "gear_equipped", gearId: "b" });
    expect(eq.equipped).toEqual({ cape: "b" });
    applyEquipmentEvent(eq, merchant, { type: "gear_unequipped", slot: "cape" });
    applyEquipmentEvent(eq, merchant, { type: "gear_unequipped", slot: "ring" as never });
    expect(eq.equipped).toEqual({});
  });

  it("la decoración del menú se pone igual que la armadura", () => {
    const { merchant, eq } = setup([{ gear: gearDef("f", { slot: "backdrop" }), owned: true }]);
    applyEquipmentEvent(eq, merchant, { type: "gear_equipped", gearId: "f" });
    expect(eq.equipped).toEqual({ backdrop: "f" });
  });
});

describe("al cambiar el catálogo", () => {
  it("una pieza retirada o que cambia de ranura deja de estar puesta", () => {
    const { merchant, eq } = setup([
      { gear: gearDef("casco", { slot: "head" }), owned: true },
      { gear: gearDef("botas", { slot: "feet" }), owned: true },
      { gear: gearDef("capa", { slot: "cape" }), owned: true },
    ]);
    for (const id of ["casco", "botas", "capa"]) applyEquipmentEvent(eq, merchant, { type: "gear_equipped", gearId: id });
    applyMerchantEvent(merchant, { type: "gear_deleted", gearId: "casco" }, T0, 0);
    applyMerchantEvent(merchant, { type: "gear_updated", gearId: "botas", patch: { slot: "hands" } }, T0, 0);
    applyMerchantEvent(merchant, { type: "gear_updated", gearId: "capa", patch: { name: "Capa nueva" } }, T0, 0);
    pruneEquipment(eq, merchant);
    expect(eq.equipped).toEqual({ cape: "capa" });
  });
});

describe("prestigio", () => {
  it("suma las estrellas de lo que llevas puesto", () => {
    const { merchant, eq } = setup([
      { gear: gearDef("a", { slot: "head", rarity: "legendary" }), owned: true },
      { gear: gearDef("b", { slot: "emblem", rarity: "rare" }), owned: true },
      { gear: gearDef("c", { slot: "body", rarity: "epic" }), owned: true },
    ]);
    applyEquipmentEvent(eq, merchant, { type: "gear_equipped", gearId: "a" });
    applyEquipmentEvent(eq, merchant, { type: "gear_equipped", gearId: "b" });
    expect(prestige(eq.equipped, merchant.catalog)).toBe(6 + 3);
  });
});

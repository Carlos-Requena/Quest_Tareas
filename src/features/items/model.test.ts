import { describe, expect, it } from "vitest";
import {
  advancePity,
  DROP_TABLES,
  dropTableFor,
  epicGuaranteed,
  itemKindOf,
  legendaryChance,
  newPity,
  pickItem,
  RARITIES,
  rarityTier,
  rollDrops,
  rollRarity,
  type Pity,
  type Rarity,
  applyItemEvent,
  itemBlobIds,
  newItemsAcc,
  type ItemDef,
} from "./model";
import { upcastReward, legacyItemId } from "./legacy";
import { project } from "../../domain/projection";
import { itemDef, questDef, withMeta } from "../../test/streams";
import { seededRandom } from "../../lib/id";

const always = (x: number) => () => x;

describe("tablas y pity", () => {
  it("las probabilidades de cada tabla suman 100 %", () => {
    for (const t of Object.values(DROP_TABLES)) expect(Object.values(t.weights).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 9);
  });

  it("élite tira dos veces con su tabla; el resto, una con la estándar", () => {
    expect(dropTableFor("elite")).toBe("elite");
    expect(dropTableFor("repeat")).toBe("standard");
    expect(dropTableFor("request")).toBe("standard");
    expect(DROP_TABLES.elite.rolls).toBe(2);
  });

  it("advancePity reinicia al sacar la rareza y suma en otro caso", () => {
    const p: Pity = { sinceLegendary: 5, sinceEpic: 5 };
    expect(advancePity(p, "common")).toEqual({ sinceLegendary: 6, sinceEpic: 6 });
    expect(advancePity(p, "epic")).toEqual({ sinceLegendary: 6, sinceEpic: 0 });
    expect(advancePity(p, "mythic")).toEqual({ sinceLegendary: 6, sinceEpic: 0 });
    expect(advancePity(p, "legendary")).toEqual({ sinceLegendary: 0, sinceEpic: 0 });
  });

  it("legendario: base 0,6 %, sube desde la tirada 74 y es seguro en la 90", () => {
    const std = DROP_TABLES.standard;
    expect(legendaryChance(std, { sinceLegendary: 0, sinceEpic: 0 })).toBeCloseTo(0.006);
    expect(legendaryChance(std, { sinceLegendary: 72, sinceEpic: 0 })).toBeCloseTo(0.006); // tirada 73
    expect(legendaryChance(std, { sinceLegendary: 73, sinceEpic: 0 })).toBeCloseTo(0.066); // tirada 74
    expect(legendaryChance(std, { sinceLegendary: 88, sinceEpic: 0 })).toBeCloseTo(0.966); // tirada 89: 0,6 + 16 × 6
    expect(legendaryChance(std, { sinceLegendary: 89, sinceEpic: 0 })).toBe(1); // tirada 90
  });

  it("épico o superior garantizado en la décima tirada", () => {
    expect(epicGuaranteed({ sinceLegendary: 0, sinceEpic: 8 })).toBe(false);
    expect(epicGuaranteed({ sinceLegendary: 0, sinceEpic: 9 })).toBe(true);
    // Con la garantía, ni la tirada más baja da algo por debajo de épico.
    expect(rarityTier(rollRarity(DROP_TABLES.standard, { sinceLegendary: 0, sinceEpic: 9 }, always(0.99)))).toBeGreaterThanOrEqual(rarityTier("epic"));
  });

  it("rollRarity: los extremos de rnd dan común y legendario", () => {
    expect(rollRarity(DROP_TABLES.standard, newPity(), always(0))).toBe("legendary");
    let n = 0;
    expect(rollRarity(DROP_TABLES.standard, newPity(), () => (n++ === 0 ? 0.5 : 0))).toBe("common");
  });

  it("200.000 tiradas con semilla: el pity nunca se supera y las tasas son razonables", () => {
    const rnd = seededRandom("gacha");
    const counts: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 0, epic: 0, mythic: 0, legendary: 0 };
    let p = newPity();
    let maxLeg = 0;
    let maxEpic = 0;
    for (let i = 0; i < 200_000; i++) {
      const r = rollRarity(DROP_TABLES.standard, p, rnd);
      counts[r]++;
      p = advancePity(p, r);
      maxLeg = Math.max(maxLeg, p.sinceLegendary);
      maxEpic = Math.max(maxEpic, p.sinceEpic);
    }
    expect(maxLeg).toBeLessThan(90);
    expect(maxEpic).toBeLessThan(10);
    // Con pity, la tasa efectiva de legendario ronda el 1,6 % de Genshin.
    const leg = counts.legendary / 200_000;
    expect(leg).toBeGreaterThan(0.012);
    expect(leg).toBeLessThan(0.02);
    expect(counts.common).toBeGreaterThan(counts.uncommon);
  });
});

describe("pickItem y rollDrops", () => {
  const pool = [itemDef("c", { rarity: "common" }), itemDef("r", { rarity: "rare" }), itemDef("l", { rarity: "legendary" })];

  it("si no hay objetos de esa rareza, baja a la inferior y, si no, sube", () => {
    expect(pickItem(pool, "epic", always(0))?.id).toBe("r");
    expect(pickItem(pool, "uncommon", always(0))?.id).toBe("c");
    expect(pickItem([itemDef("l", { rarity: "legendary" })], "common", always(0))?.id).toBe("l");
    expect(pickItem([], "common", always(0))).toBeUndefined();
  });

  it("sin objetos que puedan salir no hay drop", () => {
    expect(rollDrops("standard", [], newPity(), always(0.5))).toEqual([]);
    expect(rollDrops("standard", [itemDef("x", { droppable: false })], newPity(), always(0.5))).toEqual([]);
  });

  it("élite da dos drops y cada uno copia la rareza del objeto", () => {
    const drops = rollDrops("elite", pool, newPity(), seededRandom("x"));
    expect(drops).toHaveLength(2);
    for (const d of drops) expect(d.rarity).toBe(pool.find((i) => i.id === d.itemId)!.rarity);
  });

  it("dentro de una misma quest, la segunda tirada ya cuenta el pity de la primera", () => {
    // Pity a una de la garantía de épico: la 1.ª tirada lo consume, la 2.ª vuelve a empezar.
    // Cada tirada pide 2 números (¿legendario?, rareza) y la elección del objeto, 1 más. Con la rareza a 0 sale la más baja permitida.
    const seq = [0.99, 0, 0, 0.99, 0, 0];
    const drops = rollDrops("elite", RARITIES.map((r) => itemDef(r, { rarity: r })), { sinceLegendary: 0, sinceEpic: 9 }, () => seq.shift()!);
    expect(drops.map((d) => d.rarity)).toEqual(["epic", "common"]);
    expect(rarityTier(drops[0].rarity)).toBeGreaterThanOrEqual(rarityTier("epic"));
    expect(rarityTier(drops[1].rarity)).toBeLessThan(rarityTier("epic"));
  });
});

describe("objetos en la proyección", () => {
  const accepted = (id: string) => [
    { type: "quest_created", quest: questDef(id) },
    { type: "quest_accepted", questId: id },
  ] as const;

  it("suma objeto garantizado y drops al inventario y avanza el pity", () => {
    const st = project(
      withMeta([
        { type: "item_created", item: itemDef("i1") },
        { type: "item_created", item: itemDef("i2", { rarity: "epic" }) },
        ...accepted("q"),
        { type: "quest_completed", questId: "q", reward: { xp: 1, gold: 1, itemId: "i1" }, drops: [{ itemId: "i1", rarity: "common" }, { itemId: "i2", rarity: "epic" }] },
      ]),
    );
    // i1 sale en los cofres: es coleccionable y el repetido se quema, pero su tirada cuenta para el pity.
    expect(st.player.inventory).toEqual({ i1: 1, i2: 1 });
    expect(st.player.pity).toEqual({ sinceLegendary: 2, sinceEpic: 0 });
    expect(Object.keys(st.player.discovered).sort()).toEqual(["i1", "i2"]);
  });

  it("los que no salen en cofres se acumulan; los coleccionables, no", () => {
    const st = project(
      withMeta([
        { type: "item_created", item: itemDef("fixed", { droppable: false }) },
        { type: "item_created", item: itemDef("chest") },
        ...accepted("q"),
        { type: "quest_completed", questId: "q", reward: { xp: 1, gold: 1, itemId: "fixed" }, drops: [{ itemId: "chest", rarity: "common" }] },
        ...accepted("q2"),
        { type: "quest_completed", questId: "q2", reward: { xp: 1, gold: 1, itemId: "fixed" }, drops: [{ itemId: "chest", rarity: "common" }] },
      ]),
    );
    expect(st.player.inventory).toEqual({ fixed: 2, chest: 1 });
  });

  it("si un objeto pasa a salir en los cofres, sus repetidos desaparecen", () => {
    const st = project(
      withMeta([
        { type: "item_created", item: itemDef("i", { droppable: false }) },
        ...accepted("q"),
        { type: "quest_completed", questId: "q", reward: { xp: 1, gold: 1, itemId: "i" } },
        ...accepted("q2"),
        { type: "quest_completed", questId: "q2", reward: { xp: 1, gold: 1, itemId: "i" } },
        { type: "item_updated", itemId: "i", patch: { droppable: true } },
      ]),
    );
    expect(st.player.inventory).toEqual({ i: 1 });
  });

  it("el tipo antiguo en texto libre se pasa a un tipo fijo al leerlo", () => {
    expect(["Poción", "Reliquia", "Artefacto", "Grimorio", "Trofeo", "Tesoro", "Material", "Accesorio", "遺物", "ポーション", "", "Cosa rara"].map(itemKindOf)).toEqual([
      "consumable", "relic", "relic", "tome", "trophy", "treasure", "material", "accessory", "relic", "consumable", "other", "other",
    ]);
    const st = project(
      withMeta([
        { type: "item_created", item: { ...itemDef("old"), kind: "Pluma mágica" as never } },
        { type: "item_updated", itemId: "old", patch: { kind: "Trofeo" as never } },
      ]),
    );
    expect(st.items.get("old")?.kind).toBe("trophy");
  });

  it("un objeto retirado sale del inventario y no vuelve aunque se cree otra vez", () => {
    const st = project(
      withMeta([
        { type: "item_created", item: itemDef("i1") },
        ...accepted("q"),
        { type: "quest_completed", questId: "q", reward: { xp: 1, gold: 1, itemId: "i1" } },
        { type: "item_deleted", itemId: "i1" },
        { type: "item_created", item: itemDef("i1") },
      ]),
    );
    expect(st.items.has("i1")).toBe(false);
    expect(st.player.inventory).toEqual({});
    expect(st.player.discovered).toEqual({});
  });

  it("editar un objeto no cambia su id ni su fecha, ni el pity ya acumulado", () => {
    const st = project(
      withMeta([
        { type: "item_created", item: itemDef("i1", { rarity: "common" }) },
        ...accepted("q"),
        { type: "quest_completed", questId: "q", reward: { xp: 1, gold: 1 }, drops: [{ itemId: "i1", rarity: "common" }] },
        { type: "item_updated", itemId: "i1", patch: { rarity: "legendary", name: "Nuevo", id: "otro", createdAt: 5 } as never },
      ]),
    );
    expect(st.items.get("i1")).toMatchObject({ id: "i1", name: "Nuevo", rarity: "legendary", createdAt: itemDef("i1").createdAt });
    expect(st.player.pity.sinceLegendary).toBe(1);
  });
});

describe("recompensa v1 → v2 (upcasting)", () => {
  it("el texto antiguo pasa a ser un objeto común con id estable", () => {
    const { reward, item } = upcastReward({ xp: 10, gold: 5, item: " Poción " } as never, 123);
    expect(reward).toEqual({ xp: 10, gold: 5, itemId: legacyItemId("Poción") });
    expect(item).toMatchObject({ id: "legacy:Poción", name: "Poción", rarity: "common", droppable: false, createdAt: 123 });
  });

  it("las recompensas actuales o sin objeto quedan igual", () => {
    expect(upcastReward({ xp: 1, gold: 2, itemId: "x" }, 0)).toEqual({ reward: { xp: 1, gold: 2, itemId: "x" } });
    expect(upcastReward({ xp: 1, gold: 2, item: "  " } as never, 0)).toEqual({ reward: { xp: 1, gold: 2 } });
  });

  it("una quest antigua da su objeto al completarla, el mismo en todos los dispositivos", () => {
    const st = project(
      withMeta([
        { type: "quest_created", quest: questDef("q", { reward: { xp: 10, gold: 5, item: "Poción" } as never }) },
        { type: "quest_accepted", questId: "q" },
        { type: "quest_completed", questId: "q", reward: { xp: 10, gold: 5, item: "Poción" } as never },
      ]),
    );
    expect(st.player.inventory).toEqual({ "legacy:Poción": 1 });
    expect(st.items.get("legacy:Poción")?.droppable).toBe(false);
  });
});

describe("imagen nítida (art)", () => {
  const art = { blobId: "b1", mime: "image/webp", size: 9 };
  const created = (extra: Partial<ItemDef>) => {
    const acc = newItemsAcc();
    applyItemEvent(acc, { type: "item_created", item: { id: "x", name: "X", rarity: "rare", kind: "other", description: "", droppable: true, createdAt: 0, ...extra } });
    return acc;
  };

  it("se guarda con el objeto y cuenta como binario en uso", () => {
    const acc = created({ image: "data:a", art });
    expect(acc.catalog.get("x")?.art).toEqual(art);
    expect(itemBlobIds(acc.catalog.values())).toEqual(new Set(["b1"]));
  });

  it("una referencia mal formada se ignora", () => {
    const acc = created({ image: "data:a", art: { blobId: 3 } as unknown as ItemDef["art"] });
    expect(acc.catalog.get("x")).not.toHaveProperty("art");
  });

  it("cambiar o quitar la imagen sin traer otra nítida la quita; editar otro campo la conserva", () => {
    const acc = created({ image: "data:a", art });
    applyItemEvent(acc, { type: "item_updated", itemId: "x", patch: { name: "Y" } });
    expect(acc.catalog.get("x")?.art).toEqual(art);
    applyItemEvent(acc, { type: "item_updated", itemId: "x", patch: { image: "data:b", art: { ...art, blobId: "b2" } } });
    expect(acc.catalog.get("x")?.art?.blobId).toBe("b2");
    applyItemEvent(acc, { type: "item_updated", itemId: "x", patch: { image: "" } });
    expect(acc.catalog.get("x")).not.toHaveProperty("art");
  });
});

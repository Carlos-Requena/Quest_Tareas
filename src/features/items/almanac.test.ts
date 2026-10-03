import { describe, expect, it } from "vitest";
import { gearDef, itemDef } from "../../test/streams";
import { BUILTIN_GEAR } from "../armory/model";
import { ALMANACS, almanacEntries, almanacProgress, almanacVisible, entryOwned, gearKey, itemKey } from "./almanac";

const items = [
  itemDef("chest-c", { rarity: "common" }),
  itemDef("chest-l", { rarity: "legendary" }),
  itemDef("quest", { droppable: false }),
];
const gear = [
  gearDef("helm", { slot: "head", rarity: "rare" }),
  gearDef("sword", { slot: "weapon", rarity: "epic" }),
  gearDef("bg", { slot: "backdrop" }),
  gearDef("crest", { slot: "emblem", rarity: "mythic" }),
];

describe("almanaques por tipo de objeto", () => {
  it("cada cosa va a un solo almanaque", () => {
    const keys = ALMANACS.flatMap((a) => almanacEntries(a, items, gear).map((e) => e.key));
    expect(keys.sort()).toEqual([...items.map((i) => itemKey(i.id)), ...gear.map((g) => gearKey(g.id))].sort());
  });

  it("coleccionables (de cofre), objetos de quest, armaduras, fondos y emblemas", () => {
    const ids = (a: (typeof ALMANACS)[number]) => almanacEntries(a, items, gear).map((e) => (e.kind === "item" ? e.item.id : e.gear.id));
    expect(ids("chest")).toEqual(["chest-l", "chest-c"]); // de mayor a menor rareza
    expect(ids("quest")).toEqual(["quest"]);
    expect(ids("armor")).toEqual(["helm", "sword"]); // por ranura, como en el muñeco
    expect(ids("backdrop")).toEqual(["bg"]);
    expect(ids("emblem")).toEqual(["crest"]);
  });

  it("el equipo de serie también está en los almanaques", () => {
    const all = [...BUILTIN_GEAR.values()];
    const n = (["armor", "backdrop", "emblem"] as const).reduce((s, a) => s + almanacEntries(a, [], all).length, 0);
    expect(n).toBe(all.length);
  });

  it("conseguido: el objeto en el inventario o la pieza comprada", () => {
    const [legendary] = almanacEntries("chest", items, gear);
    const [helm] = almanacEntries("armor", items, gear);
    const none = { inventory: {}, owned: {} };
    expect(entryOwned(legendary, none)).toBe(false);
    expect(entryOwned(legendary, { ...none, inventory: { "chest-l": 1 } })).toBe(true);
    expect(entryOwned(helm, none)).toBe(false);
    expect(entryOwned(helm, { ...none, owned: { helm: { at: 1, price: 1 } } })).toBe(true);
  });

  it("progreso en total y por rareza, de mayor a menor", () => {
    const entries = almanacEntries("chest", items, gear);
    const p = almanacProgress(entries, (e) => e.key === itemKey("chest-c"));
    expect(p).toMatchObject({ got: 1, total: 2 });
    expect(p.byRarity[0]).toEqual({ rarity: "legendary", got: 0, total: 1 });
    expect(p.byRarity[p.byRarity.length - 1]).toEqual({ rarity: "common", got: 1, total: 1 });
  });

  it("los coleccionables siempre se ven en el índice; los demás, si tienen algo", () => {
    expect(almanacVisible("chest", 0)).toBe(true);
    expect(almanacVisible("quest", 0)).toBe(false);
    expect(almanacVisible("quest", 1)).toBe(true);
  });
});

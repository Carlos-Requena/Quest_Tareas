import { describe, expect, it } from "vitest";
import { RARITIES } from "../items/model";
import { gearDef, T0 } from "../../test/streams";
import {
  applyMerchantEvent,
  buyBlocker,
  gearBlobIds,
  isNewArrival,
  LEVEL_REQUIRED,
  newMerchantAcc,
  nextShowing,
  nextWeekStart,
  PRICES,
  priceOf,
  SLOT_PRICE_FACTOR,
  rankRequired,
  SHOWCASE_SIZE,
  showcase,
  sortGear,
  weekStart,
  type GearDef,
} from "./model";

const DAY = 86_400_000;
/** Un lunes a mediodía (hora de Madrid: vitest.config.ts fija TZ). */
const MONDAY = new Date(2026, 9, 5, 12).getTime(); // 5 oct 2026
const OLD = MONDAY - 30 * DAY;

const catalog = (n: number, extra: Partial<GearDef> = {}) =>
  Array.from({ length: n }, (_, i) => gearDef(`g${String(i).padStart(2, "0")}`, { createdAt: OLD, ...extra }));

describe("precios y requisitos", () => {
  it("el recargo por ranura nunca abarata y redondea a precio de tienda", () => {
    for (const f of Object.values(SLOT_PRICE_FACTOR)) expect(f).toBeGreaterThanOrEqual(1);
    expect(priceOf({ slot: "hands", rarity: "common" })).toBe(PRICES.common);
    expect(priceOf({ slot: "head", rarity: "common" })).toBe(1_300);
    expect(priceOf({ slot: "weapon", rarity: "legendary" })).toBe(150_000);
    expect(priceOf({ slot: "backdrop", rarity: "legendary" })).toBe(160_000);
    expect(priceOf({ slot: "amulet", rarity: "mythic" })).toBe(59_000);
    for (const r of RARITIES)
      for (const slot of Object.keys(SLOT_PRICE_FACTOR) as (keyof typeof SLOT_PRICE_FACTOR)[]) {
        const p = priceOf({ slot, rarity: r });
        expect(p % (p < 10_000 ? 100 : 1000)).toBe(0);
      }
  });

  it("cuanto más rara, más cara y con más rango", () => {
    for (let i = 1; i < RARITIES.length; i++) {
      expect(PRICES[RARITIES[i]]).toBeGreaterThan(PRICES[RARITIES[i - 1]]);
      expect(LEVEL_REQUIRED[RARITIES[i]]).toBeGreaterThan(LEVEL_REQUIRED[RARITIES[i - 1]]);
    }
  });

  it("cada rareza pide el primer nivel de un rango, de F a A", () => {
    expect(RARITIES.map((rarity) => rankRequired({ rarity }))).toEqual(["F", "E", "D", "C", "B", "A"]);
  });
});

describe("semanas", () => {
  it("la semana empieza el lunes a las 00:00, hora local", () => {
    const sunday = new Date(2026, 9, 11, 23, 59).getTime();
    expect(weekStart(MONDAY)).toBe(new Date(2026, 9, 5).getTime());
    expect(weekStart(sunday)).toBe(new Date(2026, 9, 5).getTime());
    expect(nextWeekStart(sunday)).toBe(new Date(2026, 9, 12).getTime());
    expect(weekStart(new Date(2026, 9, 5).getTime())).toBe(new Date(2026, 9, 5).getTime());
  });

  it("con cambio de hora, el lunes sigue siendo a las 00:00 (semana de 167 o 169 horas)", () => {
    // 2026: el horario de verano empieza el 29 de marzo y acaba el 25 de octubre en Madrid.
    const spring = new Date(2026, 2, 26, 9).getTime();
    expect(nextWeekStart(spring)).toBe(new Date(2026, 2, 30).getTime());
    expect(nextWeekStart(spring) - weekStart(spring)).toBe(167 * 3_600_000);
    const autumn = new Date(2026, 9, 22, 9).getTime();
    expect(nextWeekStart(autumn)).toBe(new Date(2026, 9, 26).getTime());
    expect(nextWeekStart(autumn) - weekStart(autumn)).toBe(169 * 3_600_000);
  });
});

describe("escaparate", () => {
  it("con pocas piezas, se vende todo", () => {
    const sc = showcase(catalog(SHOWCASE_SIZE), {}, MONDAY);
    expect(sc.ids.size).toBe(SHOWCASE_SIZE);
    expect(sc.fresh.size).toBe(0);
    expect(sc.endsAt).toBe(new Date(2026, 9, 12).getTime());
  });

  it("con muchas, solo SHOWCASE_SIZE, y lo mismo durante toda la semana", () => {
    const all = catalog(12);
    const a = showcase(all, {}, MONDAY);
    const b = showcase(all, {}, new Date(2026, 9, 11, 23, 59).getTime());
    expect(a.ids.size).toBe(SHOWCASE_SIZE);
    expect([...b.ids]).toEqual([...a.ids]);
  });

  it("no depende del orden del catálogo", () => {
    const all = catalog(12);
    expect([...showcase([...all].reverse(), {}, MONDAY).ids].sort()).toEqual([...showcase(all, {}, MONDAY).ids].sort());
  });

  it("cambia de una semana a otra y, con el tiempo, sale todo", () => {
    const all = catalog(12);
    const seen = new Set<string>();
    const weeks = new Set<string>();
    let t = MONDAY;
    for (let i = 0; i < 26; i++) {
      const ids = [...showcase(all, {}, t).ids].sort();
      ids.forEach((id) => seen.add(id));
      weeks.add(ids.join());
      t = nextWeekStart(t);
    }
    expect(seen.size).toBe(12);
    expect(weeks.size).toBeGreaterThan(10);
  });

  it("las recién llegadas siempre están, sin quitar sitio a las demás", () => {
    const all = [...catalog(12), gearDef("nueva", { createdAt: MONDAY - 6 * DAY })];
    const sc = showcase(all, {}, MONDAY);
    expect(sc.fresh).toEqual(new Set(["nueva"]));
    expect(sc.ids.has("nueva")).toBe(true);
    expect(sc.ids.size).toBe(SHOWCASE_SIZE + 1);
    // A los 7 días deja de ser nueva.
    expect(isNewArrival(all[12], MONDAY + DAY)).toBe(false);
  });

  it("lo que ya es tuyo no se vende y otra pieza ocupa su sitio", () => {
    const all = catalog(12);
    const before = showcase(all, {}, MONDAY);
    const bought = [...before.ids][0];
    const after = showcase(all, { [bought]: { at: MONDAY, price: 1 } }, MONDAY);
    expect(after.ids.has(bought)).toBe(false);
    expect(after.ids.size).toBe(SHOWCASE_SIZE);
  });

  it("nextShowing da el lunes en que vuelve, o nada si ya es tuya", () => {
    const all = catalog(12);
    const away = all.find((g) => !showcase(all, {}, MONDAY).ids.has(g.id))!;
    const back = nextShowing(away.id, all, {}, MONDAY)!;
    expect(back).toBeGreaterThan(MONDAY);
    expect(weekStart(back)).toBe(back);
    expect(showcase(all, {}, back).ids.has(away.id)).toBe(true);
    // Es la primera: en las semanas de en medio no está.
    for (let t = nextWeekStart(MONDAY); t < back; t = nextWeekStart(t)) expect(showcase(all, {}, t).ids.has(away.id)).toBe(false);
    expect(nextShowing(away.id, all, { [away.id]: { at: T0, price: 0 } }, MONDAY)).toBeUndefined();
  });
});

describe("comprar", () => {
  const g = gearDef("yelmo", { rarity: "rare" });
  const rich = { level: 5, gold: priceOf(g), owned: {} };

  it("se puede con el escaparate, el rango y el oro justos", () => {
    expect(buyBlocker(g, rich, true)).toBeUndefined();
  });

  it("dice por qué no, en orden", () => {
    expect(buyBlocker(undefined, rich, true)).toBe("missing");
    expect(buyBlocker(g, { ...rich, owned: { yelmo: { at: 0, price: 1 } } }, false)).toBe("owned");
    expect(buyBlocker(g, { ...rich, level: 1, gold: 0 }, false)).toBe("away");
    expect(buyBlocker(g, { ...rich, level: 4, gold: 0 }, true)).toBe("rank");
    expect(buyBlocker(g, { ...rich, gold: priceOf(g) - 1 }, true)).toBe("gold");
  });
});

describe("proyección del mercader", () => {
  const apply = (acc = newMerchantAcc()) => ({
    acc,
    run: (e: Parameters<typeof applyMerchantEvent>[1], gold = 0) => applyMerchantEvent(acc, e, T0, gold),
  });

  it("ignora piezas con ranura o rareza desconocidas y los ids repetidos", () => {
    const { acc, run } = apply();
    run({ type: "gear_created", gear: gearDef("a", { slot: "ring" as never }) });
    run({ type: "gear_created", gear: gearDef("b", { rarity: "divine" as never }) });
    run({ type: "gear_created", gear: gearDef("c", { name: "Primera" }) });
    run({ type: "gear_created", gear: gearDef("c", { name: "Segunda" }) });
    expect([...acc.catalog.keys()]).toEqual(["c"]);
    expect(acc.catalog.get("c")!.name).toBe("Primera");
  });

  it("edita por campos, sin aceptar ranuras ni rarezas imposibles", () => {
    const { acc, run } = apply();
    run({ type: "gear_created", gear: gearDef("a", { slot: "backdrop", image: "data:x", art: { blobId: "h", mime: "image/webp", size: 9 } }) });
    run({ type: "gear_updated", gearId: "a", patch: { name: "Nuevo", slot: "ring" as never, rarity: "epic" } });
    expect(acc.catalog.get("a")).toMatchObject({ name: "Nuevo", slot: "backdrop", rarity: "epic", art: { blobId: "h" } });
    run({ type: "gear_updated", gearId: "a", patch: { image: "", art: null } });
    expect(acc.catalog.get("a")!.image).toBe("");
    expect(acc.catalog.get("a")!.art).toBeUndefined();
    run({ type: "gear_updated", gearId: "nada", patch: { name: "x" } });
    expect(acc.catalog.size).toBe(1);
  });

  it("comprar gasta el precio del evento solo si llega el oro y no es tuya", () => {
    const { acc, run } = apply();
    run({ type: "gear_created", gear: gearDef("a") });
    expect(run({ type: "gear_purchased", gearId: "a", price: 500 }, 499)).toBe(0);
    expect(acc.owned.a).toBeUndefined();
    expect(run({ type: "gear_purchased", gearId: "a", price: 500 }, 500)).toBe(500);
    expect(acc.owned.a).toEqual({ at: T0, price: 500 });
    // Comprada en otro dispositivo a la vez: la segunda no cobra.
    expect(run({ type: "gear_purchased", gearId: "a", price: 500 }, 9999)).toBe(0);
    expect(run({ type: "gear_purchased", gearId: "fantasma", price: 1 }, 9999)).toBe(0);
    expect(run({ type: "gear_purchased", gearId: "a", price: -5 }, 9999)).toBe(0);
  });

  it("retirar una pieza la quita también de lo comprado y no resucita", () => {
    const { acc, run } = apply();
    run({ type: "gear_created", gear: gearDef("a") });
    run({ type: "gear_purchased", gearId: "a", price: 10 }, 10);
    run({ type: "gear_deleted", gearId: "a" });
    expect(acc.catalog.has("a")).toBe(false);
    expect(acc.owned.a).toBeUndefined();
    run({ type: "gear_created", gear: gearDef("a") });
    expect(acc.catalog.has("a")).toBe(false);
    expect(run({ type: "gear_purchased", gearId: "a", price: 1 }, 99)).toBe(0);
  });

  it("gearBlobIds junta las imágenes grandes del catálogo", () => {
    const all = [gearDef("a", { art: { blobId: "x", mime: "", size: 1 } }), gearDef("b"), gearDef("c", { art: { blobId: "x", mime: "", size: 1 } })];
    expect(gearBlobIds(all)).toEqual(new Set(["x"]));
  });
});

describe("orden del catálogo", () => {
  it("por ranura, como en el muñeco, y de más a menos rara", () => {
    const sorted = sortGear([
      gearDef("fondo", { slot: "backdrop" }),
      gearDef("casco", { slot: "head", rarity: "common" }),
      gearDef("corona", { slot: "head", rarity: "legendary" }),
      gearDef("capa", { slot: "cape" }),
    ]);
    expect(sorted.map((g) => g.id)).toEqual(["corona", "casco", "capa", "fondo"]);
  });
});

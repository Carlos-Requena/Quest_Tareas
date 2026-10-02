// @vitest-environment happy-dom
// Las acciones del mercader y del equipo con el store de verdad (localStorage de un
// navegador simulado): comprar con sus reglas, ponerse lo comprado y retirar del catálogo.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { compareEvents, type GameEvent } from "../../domain/events";
import { project } from "../../domain/projection";
import { canonical } from "../snapshot/model";
import { gearDef, questDef } from "../../test/streams";
import { PRICES, SHOWCASE_SIZE, type GearDef } from "./model";

vi.mock("../../lib/sfx", async () => (await import("../../test/sfxMock")).sfxMock());

async function boot() {
  vi.resetModules();
  const { useGame } = await import("../../store/game");
  const merchant = await import("./actions");
  const equipment = await import("../equipment/actions");
  await useGame.getState().init();
  const g = () => useGame.getState();
  return { g, merchant, equipment };
}
type Booted = Awaited<ReturnType<typeof boot>>;

const stored = (): GameEvent[] => JSON.parse(localStorage.getItem("quests.events") ?? "[]").sort(compareEvents);
const consistent = (b: Booted) => expect(canonical(b.g().state)).toBe(canonical(project(stored())));
const lastEvent = () => stored()[stored().length - 1];

/** Gana `xp` y `gold` completando una quest (para tener rango y oro). */
async function earn(b: Booted, xp: number, gold: number, area = "Salud") {
  const id = `q${Math.random().toString(36).slice(2)}`;
  const reward = { xp, gold };
  await b.g().dispatch({ type: "quest_created", quest: questDef(id, { area, reward, createdAt: Date.now() }) });
  await b.g().dispatch({ type: "quest_accepted", questId: id });
  await b.g().dispatch({ type: "quest_completed", questId: id, reward, drops: [] });
}

/** Una pieza recién añadida (sale en el escaparate por ser nueva). */
async function addGear(b: Booted, id: string, extra: Partial<GearDef> = {}) {
  await b.g().dispatch({ type: "gear_created", gear: gearDef(id, { createdAt: Date.now(), ...extra }) });
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("quests.lang", "es");
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("comprar al mercader", () => {
  it("con oro y rango, compra al precio de Hu Tao y lo copia en el evento", async () => {
    const b = await boot();
    await earn(b, 2000, PRICES.rare + 50);
    await addGear(b, "espada", { slot: "weapon", rarity: "rare" });
    expect(await b.merchant.buyGear("espada")).toBe("ok");
    const e = lastEvent();
    expect(e).toMatchObject({ type: "gear_purchased", gearId: "espada", price: PRICES.rare });
    expect(b.g().state.player.gold).toBe(50);
    expect(b.g().state.player.owned.espada?.price).toBe(PRICES.rare);
    consistent(b);
  });

  it("dice por qué no: rango, oro, ya es tuya o no existe; y no emite nada", async () => {
    const b = await boot();
    await earn(b, 0, PRICES.legendary);
    await addGear(b, "corona", { rarity: "legendary" });
    await addGear(b, "capa", { slot: "cape", rarity: "common" });
    const before = stored().length;
    expect(await b.merchant.buyGear("corona")).toBe("rank");
    expect(await b.merchant.buyGear("nada")).toBe("missing");
    expect(stored()).toHaveLength(before);

    expect(await b.merchant.buyGear("capa")).toBe("ok");
    expect(await b.merchant.buyGear("capa")).toBe("owned");
  });

  it("sin oro suficiente, no hay compra", async () => {
    const b = await boot();
    await earn(b, 0, PRICES.common - 1);
    await addGear(b, "botas", { slot: "feet" });
    expect(await b.merchant.buyGear("botas")).toBe("gold");
    expect(b.g().state.player.owned).toEqual({});
  });

  it("lo que no está en el escaparate de esta semana no se vende", async () => {
    const b = await boot();
    await earn(b, 0, 99_999);
    // Doce piezas antiguas: solo SHOWCASE_SIZE están a la venta esta semana.
    const old = Date.now() - 30 * 86_400_000;
    for (let i = 0; i < 12; i++) await addGear(b, `g${i}`, { createdAt: old });
    const onSale = b.merchant.currentShowcase().ids;
    expect(onSale.size).toBe(SHOWCASE_SIZE);
    const away = [...b.g().state.gear.keys()].find((id) => !onSale.has(id))!;
    const here = [...onSale][0];
    expect(await b.merchant.buyGear(away)).toBe("away");
    expect(await b.merchant.buyGear(here)).toBe("ok");
    consistent(b);
  });
});

describe("crear, editar y retirar mercancía", () => {
  it("el precio no se elige: el borrador solo lleva nombre, tipo, rareza, imagen y descripción", async () => {
    const b = await boot();
    const id = await b.merchant.createGear({ name: "  Yelmo del Alba  ", slot: "head", rarity: "epic", description: "Brilla.", image: "data:x" });
    const g = b.g().state.gear.get(id!)!;
    expect(g).toMatchObject({ name: "Yelmo del Alba", slot: "head", rarity: "epic", image: "data:x" });
    expect(g.art).toBeUndefined();
    const e = lastEvent() as Extract<GameEvent, { type: "gear_created" }>;
    expect(e.type).toBe("gear_created");
    expect(e.gear).not.toHaveProperty("price");
    expect(await b.merchant.createGear({ name: "   ", slot: "head", rarity: "epic", description: "" })).toBeUndefined();
  });

  it("editar solo envía lo que cambia; quitar la imagen la deja vacía", async () => {
    const b = await boot();
    const id = (await b.merchant.createGear({ name: "Capa", slot: "cape", rarity: "common", description: "", image: "data:x" }))!;
    await b.merchant.updateGear(id, { name: "Capa", slot: "cape", rarity: "rare", description: "" });
    const e = lastEvent();
    expect(e).toMatchObject({ type: "gear_updated", gearId: id, patch: { rarity: "rare", image: "" } });
    expect(Object.keys((e as { patch: object }).patch).sort()).toEqual(["image", "rarity"]);
    const n = stored().length;
    await b.merchant.updateGear(id, { name: "Capa", slot: "cape", rarity: "rare", description: "" });
    expect(stored()).toHaveLength(n);
  });

  it("retirar una pieza puesta la quita del muñeco y de lo comprado", async () => {
    const b = await boot();
    await earn(b, 0, 5000);
    await addGear(b, "casco");
    await b.merchant.buyGear("casco");
    await b.equipment.equipGear("casco");
    expect(b.g().state.player.equipped).toEqual({ head: "casco" });
    await b.merchant.deleteGear("casco");
    expect(b.g().state.player.equipped).toEqual({});
    expect(b.g().state.player.owned).toEqual({});
    expect(b.g().state.player.gold).toBe(5000 - PRICES.common);
    consistent(b);
  });
});

describe("ponerse el equipo", () => {
  it("solo lo comprado; ponérselo dos veces no emite otro evento; quitar vacía la ranura", async () => {
    const b = await boot();
    await earn(b, 0, 5000);
    await addGear(b, "escudo", { slot: "shield" });
    await b.equipment.equipGear("escudo");
    expect(b.g().state.player.equipped).toEqual({});
    await b.merchant.buyGear("escudo");
    await b.equipment.equipGear("escudo");
    const n = stored().length;
    await b.equipment.equipGear("escudo");
    expect(stored()).toHaveLength(n);
    expect(b.g().state.player.equipped).toEqual({ shield: "escudo" });
    await b.equipment.unequipSlot("shield");
    expect(b.g().state.player.equipped).toEqual({});
    consistent(b);
  });

  it("lo puesto sobrevive a cerrar y abrir la app", async () => {
    const a = await boot();
    await earn(a, 0, 5000);
    await addGear(a, "fondo", { slot: "backdrop" });
    await a.merchant.buyGear("fondo");
    await a.equipment.equipGear("fondo");
    const b = await boot();
    expect(b.g().state.player.equipped).toEqual({ backdrop: "fondo" });
    expect(b.g().state.player.attributes.map((x) => x.name)).toEqual(["Salud"]);
  });
});

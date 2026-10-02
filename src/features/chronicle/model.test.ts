import { describe, expect, it } from "vitest";
import { project } from "../../domain/projection";
import { gearDef, itemDef, questDef, temporalDef, withMeta, randomStream, T0 } from "../../test/streams";
import type { EventBody } from "../../domain/events";
import { chronicleDays, chronicleTotals, rarest } from "./model";

const q = (id: string, xp: number, area = "Salud"): EventBody => ({ type: "quest_created", quest: questDef(id, { title: `Quest ${id}`, area, reward: { xp, gold: 10 } }) });
const run = (id: string, xp: number, drops: { itemId: string; rarity: "rare" | "common" }[] = []): EventBody[] => [
  { type: "quest_accepted", questId: id },
  { type: "quest_completed", questId: id, reward: { xp, gold: 10 }, drops },
];

describe("lo que apunta la proyección", () => {
  it("una entrada por quest completada (los duplicados no), encargo cumplido y compra con oro", () => {
    const st = project(
      withMeta([
        q("a", 120),
        ...run("a", 120),
        { type: "quest_completed", questId: "a", reward: { xp: 120, gold: 10 } },
        { type: "temporal_created", temporal: temporalDef("t", { title: "Dentista", difficulty: 4 }) },
        { type: "temporal_completed", temporalId: "t", reward: { xp: 300, gold: 50 } },
        { type: "gear_created", gear: gearDef("g", { name: "Yelmo" }) },
        { type: "gear_purchased", gearId: "g", price: 9999 },
        { type: "gear_purchased", gearId: "g", price: 40 },
        { type: "gear_purchased", gearId: "armory-pot_lid", price: 5 },
      ]),
    );
    const k = st.chronicle.entries.map((e) => e.k);
    expect(k).toEqual(["quest", "temporal", "purchase", "purchase"]);
    expect(st.chronicle.entries[1]).toMatchObject({ title: "Dentista", skulls: 4, xp: 300, xpAfter: 420 });
    expect(st.chronicle.entries[2]).toMatchObject({ name: "Yelmo", price: 40 });
    expect(st.chronicle.startedAt).toBe(T0);
  });

  it("apunta los objetos vistos por primera vez, no los repetidos", () => {
    const st = project(
      withMeta([
        { type: "item_created", item: itemDef("i", { rarity: "rare", name: "Pluma" }) },
        q("a", 50),
        q("b", 50),
        ...run("a", 50, [{ itemId: "i", rarity: "rare" }]),
        ...run("b", 50, [{ itemId: "i", rarity: "rare" }]),
      ]),
    );
    const [a, b] = st.chronicle.entries;
    expect(a.k === "quest" && a.found).toEqual([{ id: "i", name: "Pluma", rarity: "rare" }]);
    expect(b.k === "quest" && b.found).toBeUndefined();
    expect(rarest(a.k === "quest" ? a.found : undefined)).toBe("rare");
  });
});

describe("la vista por días", () => {
  it("agrupa por día local, numera los días de la aventura y deduce subidas de nivel y de atributo", () => {
    const ev = withMeta([q("a", 150), ...run("a", 150), q("b", 150, "Estudio"), ...run("b", 150)]);
    // La segunda quest, dos días después.
    for (const e of ev.slice(3)) e.ts += 2 * 86_400_000;
    const st = project(ev);
    const days = chronicleDays(st.chronicle);
    expect(days.map((d) => d.n)).toEqual([1, 3]);
    expect(days[0].lines[0]).toMatchObject({ levelUp: 2, attrUp: { name: "Salud", level: 2 } });
    expect(days[1].lines[0].levelUp).toBeUndefined();
    expect(days[1].xp).toBe(150);
    const tot = chronicleTotals(st.chronicle, ev[ev.length - 1].ts);
    expect(tot).toMatchObject({ quests: 2, activeDays: 2, days: 3 });
  });

  it("en un historial aleatorio, la XP de la crónica cuadra con la del jugador", () => {
    for (const seed of ["cr1", "cr2"]) {
      const st = project(randomStream(seed, 500));
      const last = st.chronicle.entries[st.chronicle.entries.length - 1];
      expect(last?.xpAfter ?? 0).toBe(st.player.xp);
      const xp = chronicleDays(st.chronicle).reduce((n, d) => n + d.xp, 0);
      expect(xp).toBe(st.player.xp);
      expect(st.chronicle.entries.filter((e) => e.k === "quest")).toHaveLength(st.player.completedCount);
    }
  });
});

describe("páginas", () => {
  it("ninguna página se pasa de renglones, nada se pierde y un día partido repite su encabezado", async () => {
    const { paginate, blockWeight, chronicleDays: days } = await import("./model");
    const st = project(randomStream("pag", 900));
    const d = days(st.chronicle);
    const pages = paginate(d, 12);
    for (const p of pages) expect(p.reduce((n, b) => n + blockWeight(b), 0)).toBeLessThanOrEqual(12);
    const lines = pages.flat().filter((b) => b.kind === "line");
    expect(lines).toHaveLength(st.chronicle.entries.length);
    // Cada página empieza con el encabezado de un día (nuevo o «sigue»): nunca con un total suelto.
    for (const p of pages) expect(p[0].kind).toBe("day");
    expect(paginate([], 12)).toEqual([]);
  });
});

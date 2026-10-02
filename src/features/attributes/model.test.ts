import { describe, expect, it } from "vitest";
import { T0 } from "../../test/streams";
import {
  areaKey,
  attributeLevel,
  attributeXpToNext,
  gainAttribute,
  listAttributes,
  newAttributesAcc,
  radarPoints,
  radarScale,
} from "./model";

describe("áreas", () => {
  it("«  Salud », «salud» y «SALUD» son el mismo atributo", () => {
    expect(areaKey("  Salud ")).toBe("salud");
    expect(areaKey("SALUD")).toBe("salud");
    expect(areaKey("Vida   social")).toBe("vida social");
    expect(areaKey(undefined)).toBe("");
  });

  it("suma la XP y las quests, y se queda con la última forma de escribirla", () => {
    const acc = newAttributesAcc();
    gainAttribute(acc, "salud", 100, T0);
    gainAttribute(acc, " Salud ", 150, T0 + 1);
    gainAttribute(acc, "Estudio", 80, T0 + 2);
    gainAttribute(acc, "   ", 999, T0 + 3);
    gainAttribute(acc, "Hogar", Number.NaN, T0 + 4);
    expect(acc.get("salud")).toEqual({ key: "salud", name: "Salud", xp: 250, quests: 2, lastAt: T0 + 1 });
    expect(acc.get("hogar")?.xp).toBe(0);
    expect(acc.size).toBe(3);
  });

  it("un área llamada «__proto__» es un atributo más", () => {
    const acc = newAttributesAcc();
    gainAttribute(acc, "__proto__", 10, T0);
    expect(listAttributes(acc).map((a) => a.name)).toEqual(["__proto__"]);
  });
});

describe("niveles", () => {
  it("la curva es más suave que la del jugador: 822 XP para el nivel 5", () => {
    expect([1, 2, 3, 4].map(attributeXpToNext)).toEqual([60, 148, 250, 364]);
    expect(attributeLevel(0)).toEqual({ level: 1, levelXp: 0, levelXpNeeded: 60 });
    expect(attributeLevel(821).level).toBe(4);
    expect(attributeLevel(822)).toMatchObject({ level: 5, levelXp: 0 });
    expect(attributeLevel(-50).level).toBe(1);
  });

  it("listAttributes ordena de más a menos XP y desempata por nombre", () => {
    const acc = newAttributesAcc();
    gainAttribute(acc, "b", 100, T0);
    gainAttribute(acc, "a", 100, T0);
    gainAttribute(acc, "c", 500, T0);
    const list = listAttributes(acc);
    expect(list.map((a) => a.key)).toEqual(["c", "a", "b"]);
    expect(list[0]).toMatchObject({ level: 4, levelXp: 500 - 60 - 148 - 250, levelXpNeeded: 364 });
  });
});

describe("radar", () => {
  it("el borde es el múltiplo de 5 por encima del atributo más alto", () => {
    expect(radarScale([])).toBe(5);
    expect(radarScale([{ level: 5 }, { level: 2 }])).toBe(5);
    expect(radarScale([{ level: 6 }])).toBe(10);
    expect(radarScale([{ level: 23 }])).toBe(25);
  });

  it("el primer eje apunta hacia arriba y los valores se recortan a [0, 1]", () => {
    const [top, right, , left] = radarPoints([5, 10, 0, 2.5], 5);
    expect(top.x).toBeCloseTo(0);
    expect(top.y).toBeCloseTo(-1);
    expect(right.x).toBeCloseTo(1);
    expect(left.x).toBeCloseTo(-0.5);
  });
});

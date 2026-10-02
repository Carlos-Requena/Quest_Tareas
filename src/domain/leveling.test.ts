import { describe, expect, it } from "vitest";
import { levelFromXp, rankFor, xpToNext } from "./leveling";

describe("curva de XP", () => {
  it("coincide con las cifras del informe técnico", () => {
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(400).level).toBe(3);
    expect(levelFromXp(1150).level).toBe(4);
    expect(levelFromXp(450)).toMatchObject({ level: 3, levelXp: 86, levelXpNeeded: 466 });
  });

  it("se sube justo al llegar al umbral, no antes", () => {
    expect(xpToNext(1)).toBe(100);
    expect(levelFromXp(99)).toMatchObject({ level: 1, levelXp: 99 });
    expect(levelFromXp(100)).toMatchObject({ level: 2, levelXp: 0 });
  });

  it("el nivel nunca baja al ganar XP y la XP del nivel cuadra con el total", () => {
    let prev = 1;
    for (let xp = 0; xp <= 200_000; xp += 37) {
      const lv = levelFromXp(xp);
      expect(lv.level).toBeGreaterThanOrEqual(prev);
      let spent = 0;
      for (let l = 1; l < lv.level; l++) spent += xpToNext(l);
      expect(spent + lv.levelXp).toBe(xp);
      prev = lv.level;
    }
  });
});

describe("rangos", () => {
  it("rangos F → S en sus niveles", () => {
    expect([1, 2, 3, 4, 5, 7, 8, 11, 12, 16, 17, 23, 24, 99].map(rankFor)).toEqual(["F", "F", "E", "E", "D", "D", "C", "C", "B", "B", "A", "A", "S", "S"]);
  });
});

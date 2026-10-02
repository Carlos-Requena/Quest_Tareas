/** XP necesaria para pasar de `level` a `level + 1`. */
export function xpToNext(level: number): number {
  return Math.round(100 * Math.pow(level, 1.4));
}

export function levelFromXp(totalXp: number) {
  let level = 1;
  let remaining = totalXp;
  while (remaining >= xpToNext(level)) {
    remaining -= xpToNext(level);
    level++;
  }
  return { level, levelXp: remaining, levelXpNeeded: xpToNext(level) };
}

const RANKS: [number, string][] = [
  [24, "S"],
  [17, "A"],
  [12, "B"],
  [8, "C"],
  [5, "D"],
  [3, "E"],
  [1, "F"],
];

export function rankFor(level: number): string {
  return RANKS.find(([min]) => level >= min)![1];
}


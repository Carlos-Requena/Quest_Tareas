// Modelo puro de los atributos: cada área de las quests («Salud», «Estudio»…) es un
// atributo del personaje que sube con la XP de las quests de esa área.
// Sin React, sin store, sin Tauri, sin DOM. No tiene eventos propios: lee `quest_completed`.

/** Lo acumulado en un área. */
export interface AttributeState {
  /** Área normalizada: sin espacios de más y en minúsculas («  Salud » y «salud» son la misma). */
  key: string;
  /** Cómo se escribió la última vez. */
  name: string;
  xp: number;
  /** Quests completadas en esta área. */
  quests: number;
  /** Última quest completada (ts del evento). */
  lastAt: number;
}

/**
 * Acumulador de la proyección. Un Map y no un objeto: las claves las escribe el
 * usuario y un área llamada «__proto__» rompería un objeto plano.
 */
export type AttributesAcc = Map<string, AttributeState>;

export const newAttributesAcc = (): AttributesAcc => new Map();

/** El área tal como se muestra: sin espacios sobrantes. */
export const cleanArea = (area: string | undefined) => (area ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
export const areaKey = (area: string | undefined) => cleanArea(area).toLowerCase();

/** Suma la XP de una quest completada a su área. Las quests sin área no suben ningún atributo. */
export function gainAttribute(acc: AttributesAcc, area: string | undefined, xp: number, ts: number) {
  const name = cleanArea(area);
  if (!name) return;
  const key = name.toLowerCase();
  const cur = acc.get(key);
  acc.set(key, {
    key,
    name,
    xp: (cur?.xp ?? 0) + Math.max(0, Number.isFinite(xp) ? xp : 0),
    quests: (cur?.quests ?? 0) + 1,
    lastAt: ts,
  });
}

// ───────────── Niveles ─────────────

/**
 * XP para pasar un atributo de `level` a `level + 1`. Más suave que la del jugador
 * (100 · nivel^1,4) porque cada área recibe solo una parte de la XP: unas 6–8 quests
 * de 100–150 XP en un área la llevan al nivel 5 (822 XP).
 */
export const attributeXpToNext = (level: number) => Math.round(60 * Math.pow(level, 1.3));

export function attributeLevel(xp: number) {
  let level = 1;
  let rest = Math.max(0, xp);
  while (rest >= attributeXpToNext(level)) {
    rest -= attributeXpToNext(level);
    level++;
  }
  return { level, levelXp: rest, levelXpNeeded: attributeXpToNext(level) };
}

/** Un atributo listo para pintar. */
export interface Attribute extends AttributeState {
  level: number;
  levelXp: number;
  levelXpNeeded: number;
}

/** De más a menos XP (y por nombre, para que el orden sea estable). */
export function listAttributes(acc: AttributesAcc): Attribute[] {
  return [...acc.values()]
    .map((a) => ({ ...a, ...attributeLevel(a.xp) }))
    .sort((a, b) => b.xp - a.xp || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

// ───────────── Gráfico de radar ─────────────

/** Ejes del radar: las áreas con más XP. Con menos de 3 no hay polígono y se muestran barras. */
export const RADAR_AXES = 6;
export const RADAR_MIN_AXES = 3;

/** Nivel del borde del radar: múltiplo de 5 por encima del atributo más alto (5 como mínimo). */
export function radarScale(attrs: Pick<Attribute, "level">[]): number {
  const max = attrs.reduce((m, a) => Math.max(m, a.level), 0);
  return Math.max(5, Math.ceil(max / 5) * 5);
}

/** Vértices del radar (centrado en 0,0, radio 1; el primer eje apunta hacia arriba). */
export function radarPoints(values: number[], scale: number): { x: number; y: number }[] {
  const n = values.length;
  return values.map((v, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const r = Math.max(0, Math.min(1, v / scale));
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
  });
}

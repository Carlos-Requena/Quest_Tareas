// Modelo puro de los atributos: cada área de las quests («Salud», «Estudio»…) es un
// atributo del personaje que sube con la XP de las quests de esa área.
// Sin React, sin store, sin Tauri, sin DOM. No tiene eventos propios: lee `quest_completed`.

/** Lo acumulado en un área. */
export interface AttributeState {
  /**
   * Área normalizada: sin espacios de más y en minúsculas («  Salud » y «salud» son la
   * misma). Las áreas conocidas llevan su id («@health»: «Salud» y «健康» son la misma).
   */
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

// ───────────── Áreas conocidas (se traducen) ─────────────

/**
 * Áreas habituales, con las formas en que se suelen escribir en español, japonés e
 * inglés. Una quest con «Salud» y otra con «健康» suben el MISMO atributo, que se
 * muestra traducido al idioma de la interfaz (`attributes.areas.<id>`). Las demás
 * áreas son texto del usuario y se muestran tal cual.
 *
 * NORMA: añadir sinónimos cambia la proyección (une atributos): sube PROJECTION_VERSION.
 */
export const KNOWN_AREAS = {
  health: ["salud", "健康", "health", "bienestar"],
  exercise: ["ejercicio", "deporte", "gimnasio", "entrenamiento", "運動", "筋トレ", "トレーニング", "exercise", "fitness", "sport"],
  study: ["estudio", "estudios", "estudiar", "勉強", "学習", "study", "studies"],
  reading: ["lectura", "leer", "読書", "reading"],
  home: ["hogar", "casa", "tareas del hogar", "limpieza", "家事", "掃除", "home", "chores"],
  admin: ["administración", "administracion", "papeleo", "trámites", "tramites", "事務", "手続き", "admin", "paperwork"],
  work: ["trabajo", "oficina", "仕事", "work", "job"],
  finance: ["finanzas", "dinero", "ahorro", "economía", "economia", "お金", "家計", "finance", "money"],
  social: ["social", "amigos", "relaciones", "交流", "人間関係", "friends"],
  family: ["familia", "家族", "family"],
  creativity: ["creatividad", "arte", "dibujo", "escritura", "創作", "芸術", "絵", "creativity", "art"],
  music: ["música", "musica", "音楽", "music"],
  languages: ["idiomas", "idioma", "japonés", "japones", "inglés", "ingles", "語学", "英語", "日本語", "languages"],
  programming: ["programación", "programacion", "código", "codigo", "プログラミング", "開発", "programming", "coding"],
  cooking: ["cocina", "cocinar", "料理", "自炊", "cooking"],
  mind: ["mente", "meditación", "meditacion", "mindfulness", "心", "瞑想", "mind"],
  hobbies: ["ocio", "aficiones", "hobbies", "hobby", "juegos", "趣味", "ゲーム"],
} as const;

export type KnownArea = keyof typeof KNOWN_AREAS;
export const KNOWN_AREA_IDS = Object.keys(KNOWN_AREAS) as KnownArea[];

/** Prefijo de la clave de un área conocida: no puede chocar con un área escrita (va sin «@»). */
const KNOWN = "@";

const SYNONYMS: Map<string, KnownArea> = new Map(
  KNOWN_AREA_IDS.flatMap((id) => KNOWN_AREAS[id].map((w) => [w.normalize("NFC").toLowerCase(), id] as const)),
);

/** Área conocida a la que corresponde lo escrito, si la hay. */
export const knownArea = (area: string | undefined): KnownArea | undefined => SYNONYMS.get(cleanArea(area).toLowerCase());

/** Área conocida de una clave de atributo («@health» → «health»). */
export const knownAreaOfKey = (key: string): KnownArea | undefined =>
  key.startsWith(KNOWN) && (KNOWN_AREA_IDS as string[]).includes(key.slice(1)) ? (key.slice(1) as KnownArea) : undefined;

/** Clave del atributo: «@id» para las áreas conocidas; si no, el área en minúsculas. */
export const areaKey = (area: string | undefined) => {
  const known = knownArea(area);
  return known ? KNOWN + known : cleanArea(area).toLowerCase();
};

/** Suma la XP de una quest completada a su área. Las quests sin área no suben ningún atributo. */
export function gainAttribute(acc: AttributesAcc, area: string | undefined, xp: number, ts: number) {
  const name = cleanArea(area);
  if (!name) return;
  const key = areaKey(name);
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

// Modelo puro de la crónica del aventurero: el diario de lo que has hecho, día a día.
// Sin React, sin store, sin Tauri, sin DOM. No tiene eventos propios: la proyección
// apunta una entrada cada vez que un evento CUENTA (una quest completada que pasa sus
// guardas, un encargo cumplido, una compra con oro suficiente). Así la crónica nunca
// dice algo que no pasó, aunque lleguen eventos repetidos de otro dispositivo.

import { levelFromXp } from "../../domain/leveling";
import { attributeLevel, areaKey } from "../attributes/model";
import type { Category } from "../../domain/types";
import type { Rarity } from "../items/model";

/** Un objeto conseguido por primera vez (copiado: el almanaque puede cambiar después). */
export interface ChronicleFind {
  id: string;
  name: string;
  rarity: Rarity;
}

interface Base {
  ts: number;
  /** XP total del jugador después de esto (para saber si subió de nivel). */
  xpAfter: number;
}

/** Una quest completada. El título y el área se copian: retirarla no borra el recuerdo. */
export interface QuestEntry extends Base {
  k: "quest";
  questId: string;
  title: string;
  category: Category;
  area?: string;
  xp: number;
  gold: number;
  /** Drops del cofre (sin contar el objeto garantizado). */
  drops: number;
  /** Objetos vistos por primera vez. */
  found?: ChronicleFind[];
  /** Racha tras completarla, si se repite (features/streaks). */
  streak?: number;
}

/** Un encargo temporal cumplido. */
export interface TemporalEntry extends Base {
  k: "temporal";
  temporalId: string;
  title: string;
  skulls: number;
  xp: number;
  gold: number;
}

/** Una compra al mercader. */
export interface PurchaseEntry extends Base {
  k: "purchase";
  gearId: string;
  /** Nombre en el momento de comprarla (las de serie se traducen al pintar). */
  name: string;
  rarity: Rarity;
  price: number;
}

export type ChronicleEntry = QuestEntry | TemporalEntry | PurchaseEntry;

/** Acumulador de la proyección. Solo datos planos (va en el snapshot). */
export interface ChronicleAcc {
  /** Primer evento del historial: el día 1 de la aventura. */
  startedAt?: number;
  entries: ChronicleEntry[];
}

export const newChronicleAcc = (): ChronicleAcc => ({ entries: [] });

/** Cualquier evento: el primero marca el comienzo. */
export function noteStart(acc: ChronicleAcc, ts: number) {
  if (acc.startedAt === undefined || ts < acc.startedAt) acc.startedAt = ts;
}

/** Apunta una entrada. Los eventos llegan en orden: va al final. */
export function record(acc: ChronicleAcc, entry: ChronicleEntry) {
  acc.entries.push(entry);
}

// ───────────── Vistas ─────────────

/** Lo que se deduce al leer la crónica en orden: subidas de nivel, de atributo y rachas. */
export interface ChronicleLine {
  entry: ChronicleEntry;
  /** Nivel alcanzado, si esta entrada lo subió. */
  levelUp?: number;
  /** Atributo que subió de nivel con esta quest: su clave y el nivel nuevo. */
  attrUp?: { key: string; name: string; level: number };
}

export interface ChronicleDay {
  /** Medianoche local del día. */
  day: number;
  /** Día de la aventura (1 = el del primer evento). */
  n: number;
  lines: ChronicleLine[];
  xp: number;
  gold: number;
}

const midnight = (ts: number) => {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** Días naturales entre dos medianoches (sin contar el cambio de hora). */
const daysBetween = (a: number, b: number) => Math.round((midnight(b) - midnight(a)) / 86_400_000);

/**
 * Las entradas agrupadas por día (de más antiguo a más reciente), con lo que se
 * deduce de leerlas en orden: subidas de nivel y de atributo. Puro: la hora local
 * sale de `Date`, como en los plazos.
 */
export function chronicleDays(acc: ChronicleAcc): ChronicleDay[] {
  const start = acc.startedAt ?? acc.entries[0]?.ts ?? 0;
  const days: ChronicleDay[] = [];
  const areaXp = new Map<string, number>();
  let prevXp = 0;
  for (const entry of acc.entries) {
    const line: ChronicleLine = { entry };
    const before = levelFromXp(prevXp).level;
    const after = levelFromXp(entry.xpAfter).level;
    if (after > before) line.levelUp = after;
    prevXp = entry.xpAfter;
    if (entry.k === "quest" && entry.area) {
      const key = areaKey(entry.area);
      const old = areaXp.get(key) ?? 0;
      const now = old + Math.max(0, entry.xp);
      areaXp.set(key, now);
      const lv = attributeLevel(now).level;
      if (lv > attributeLevel(old).level) line.attrUp = { key, name: entry.area, level: lv };
    }
    const day = midnight(entry.ts);
    let cur = days[days.length - 1];
    if (!cur || cur.day !== day) {
      cur = { day, n: daysBetween(start, entry.ts) + 1, lines: [], xp: 0, gold: 0 };
      days.push(cur);
    }
    cur.lines.push(line);
    if (entry.k !== "purchase") {
      cur.xp += entry.xp;
      cur.gold += entry.gold;
    }
  }
  return days;
}

/** Resumen de toda la crónica, para la portada. */
export function chronicleTotals(acc: ChronicleAcc, now: number) {
  let quests = 0;
  let temporals = 0;
  let purchases = 0;
  let bestStreak = 0;
  const activeDays = new Set<number>();
  for (const e of acc.entries) {
    activeDays.add(midnight(e.ts));
    if (e.k === "quest") {
      quests++;
      bestStreak = Math.max(bestStreak, e.streak ?? 0);
    } else if (e.k === "temporal") temporals++;
    else purchases++;
  }
  return {
    quests,
    temporals,
    purchases,
    bestStreak,
    activeDays: activeDays.size,
    /** Días desde el comienzo (el de hoy incluido). */
    days: acc.startedAt === undefined ? 0 : daysBetween(acc.startedAt, now) + 1,
  };
}

/**
 * Anchura aproximada de un texto en «medios caracteres»: un ideograma o un kana
 * ocupa dos; una letra latina, uno. Sirve para estimar cuántos renglones ocupa.
 */
export function textUnits(s: string): number {
  let n = 0;
  for (const ch of s) n += (ch.codePointAt(0) ?? 0) >= 0x2e80 ? 2 : 1;
  return n;
}

/** Rareza más alta de lo encontrado por primera vez en una entrada. */
export const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "mythic", "legendary"];
export const rarest = (found: ChronicleFind[] | undefined): Rarity | undefined =>
  found?.reduce<Rarity | undefined>((m, f) => (!m || RARITY_ORDER.indexOf(f.rarity) > RARITY_ORDER.indexOf(m) ? f.rarity : m), undefined);

// ───────────── Páginas del diario ─────────────

/** Lo que ocupa una página: el encabezado de un día o una línea, con su peso en renglones. */
export type DiaryBlock =
  | { kind: "day"; day: ChronicleDay; cont: boolean }
  | { kind: "line"; line: ChronicleLine; dayN: number }
  | { kind: "total"; day: ChronicleDay };

/**
 * Renglones que ocupa un bloque, estimados sin saber el idioma (los títulos largos
 * ocupan dos). La interfaz pasa a `paginate` su propia medida, con el texto ya escrito.
 */
export function blockWeight(b: DiaryBlock): number {
  if (b.kind === "day") return 2;
  if (b.kind === "total") return 1;
  const e = b.line.entry;
  const title = e.k === "purchase" ? e.name : e.title;
  let w = title.length > 24 ? 2 : 1;
  if (e.k === "quest" && e.found?.length) w += 1;
  if (b.line.levelUp) w += 1;
  if (b.line.attrUp) w += 1;
  return w;
}

/** Renglones por página. */
export const DIARY_LINES = 15;

/**
 * Reparte los días en páginas de `lines` renglones. Un día que no cabe sigue en la
 * página siguiente con su encabezado («sigue»). Puro y estable: las mismas entradas dan
 * las mismas páginas, y añadir entradas solo cambia las últimas.
 */
export function paginate(days: ChronicleDay[], lines = DIARY_LINES, weigh: (b: DiaryBlock) => number = blockWeight): DiaryBlock[][] {
  const pages: DiaryBlock[][] = [];
  let page: DiaryBlock[] = [];
  let used = 0;
  const push = (b: DiaryBlock) => {
    page.push(b);
    used += weigh(b);
  };
  const newPage = () => {
    if (page.length) pages.push(page);
    page = [];
    used = 0;
  };
  for (const day of days) {
    // Un encabezado sin al menos una línea debajo pasa a la página siguiente.
    const first = { kind: "line", line: day.lines[0], dayN: day.n } as DiaryBlock;
    if (used && used + 2 + weigh(first) > lines) newPage();
    push({ kind: "day", day, cont: false });
    day.lines.forEach((line, i) => {
      const b: DiaryBlock = { kind: "line", line, dayN: day.n };
      // La última línea del día se guarda sitio para el total: así el total no queda solo.
      const reserve = i === day.lines.length - 1 ? 1 : 0;
      if (used + weigh(b) + reserve > lines) {
        newPage();
        push({ kind: "day", day, cont: true });
      }
      push(b);
    });
    push({ kind: "total", day });
  }
  newPage();
  return pages;
}

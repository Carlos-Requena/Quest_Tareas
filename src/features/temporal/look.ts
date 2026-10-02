// Aspecto de cada cartel: inclinación, bordes rasgados y dónde caen sus calaveras.
// Aleatorio pero estable: la semilla es el id del encargo, así cada cartel se ve
// siempre igual (la misma técnica que las grietas de QuestCard). Puro: sin DOM.

import { seededRandom } from "../../lib/id";
import type { TemporalState } from "./model";

export type PosterShape = "portrait" | "landscape";

export interface SkullSpot {
  /** Centro de la calavera, en % del cartel. */
  x: number;
  y: number;
  rotate: number;
  scale: number;
}

export interface PosterLook {
  shape: PosterShape;
  /** Inclinación en el tablón (grados). */
  rotate: number;
  /** Desplazamiento respecto a su celda (px): los carteles se pisan un poco, como en un tablón real. */
  dx: number;
  dy: number;
  /** Borde de papel rasgado (clip-path). */
  clip: string;
  skulls: SkullSpot[];
}

/**
 * Borde rasgado: puntos a lo largo del perímetro que entran unos píxeles hacia dentro.
 * `depth` es lo más que muerde el borde (px); `per` cuántos puntos por lado.
 */
export function tornEdge(seed: string, depth: number, per: number): string {
  const rnd = seededRandom(`${seed}:edge`);
  const bite = () => (rnd() * depth).toFixed(1);
  const pts: string[] = [];
  for (let i = 0; i < per; i++) pts.push(`${((i / per) * 100).toFixed(2)}% ${bite()}px`);
  for (let i = 0; i < per; i++) pts.push(`calc(100% - ${bite()}px) ${((i / per) * 100).toFixed(2)}%`);
  for (let i = 0; i < per; i++) pts.push(`${(100 - (i / per) * 100).toFixed(2)}% calc(100% - ${bite()}px)`);
  for (let i = 0; i < per; i++) pts.push(`${bite()}px ${(100 - (i / per) * 100).toFixed(2)}%`);
  return `polygon(${pts.join(",")})`;
}

/**
 * Calaveras como sellos de lacre: se amontonan en la esquina inferior derecha y
 * pisan el borde del cartel, como en la imagen de referencia. En los apaisados
 * se reparten más a lo largo del borde inferior.
 */
export function skullSpots(seed: string, n: number, shape: PosterShape): SkullSpot[] {
  const rnd = seededRandom(`${seed}:skulls`);
  const spots: SkullSpot[] = [];
  for (let i = 0; i < n; i++) {
    // Recorren el borde de derecha a izquierda; las primeras suben un poco por el lateral.
    const along = n === 1 ? 0 : i / (n - 1);
    const reach = shape === "landscape" ? 14 + n * 6 : 12 + n * 5;
    const x = (shape === "landscape" ? 93 : 89) - along * reach + (rnd() - 0.5) * 6;
    const y = 94 - (i % 2) * 6 + (rnd() - 0.5) * 5 - (i === 0 && n > 2 ? 9 : 0);
    spots.push({ x, y, rotate: (rnd() - 0.5) * 56, scale: 0.86 + rnd() * 0.24 });
  }
  return spots;
}

export function posterLook(t: Pick<TemporalState, "id" | "difficulty" | "attachments">): PosterLook {
  const rnd = seededRandom(t.id);
  const hasImage = t.attachments.some((a) => !!a.thumb);
  // Los que llevan imagen tienden a ser apaisados (como los de la referencia con dibujo).
  const shape: PosterShape = hasImage ? (rnd() < 0.55 ? "landscape" : "portrait") : rnd() < 0.18 ? "landscape" : "portrait";
  return {
    shape,
    rotate: (rnd() - 0.5) * 5,
    dx: (rnd() - 0.5) * 14,
    dy: (rnd() - 0.5) * 12,
    clip: tornEdge(t.id, 3.2, 18),
    skulls: skullSpots(t.id, t.difficulty, shape),
  };
}

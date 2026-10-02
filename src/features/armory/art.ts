// Arte de las piezas de serie, dibujado con código: un SVG por pieza a partir de una
// plantilla por forma (sombrero, coraza, espada…) y una paleta. Puro: solo construye
// cadenas de texto; nada de DOM. Los fondos del menú son escenas a pantalla completa
// (cielo, montañas, estrellas…) hechas con la misma idea y una semilla fija.

import { seededRandom } from "../../lib/id";

/** Colores de una pieza: cuerpo (con su brillo y su sombra) y un acento (gemas, ribetes). */
export interface Palette {
  main: string;
  dark: string;
  light: string;
  accent: string;
}

export const ICON_KINDS = [
  // cabeza
  "hood", "witchhat", "headband", "dragonhelm", "ribbon", "slime",
  // cuerpo
  "tunic", "tracksuit", "maid", "robe", "plate", "lamellar",
  // manos
  "glove", "gauntlet", "bracer", "knuckle",
  // pies
  "boot", "sandal", "wingboot", "greave",
  // armas
  "sword", "katana", "staff", "wand", "flail", "greatsword",
  // escudos
  "roundshield", "potlid", "kite", "crystalshield", "towershield", "aegis",
  // capas
  "cape", "cloak", "hagoromo",
  // amuletos
  "pendant", "teardrop", "feather", "badge", "shard", "charm",
  // emblemas
  "crest-swords", "crest-drop", "crest-quarters", "crest-eye", "crest-dragon", "crest-bird",
] as const;
export type IconKind = (typeof ICON_KINDS)[number];

export interface IconSpec {
  kind: IconKind;
  p: Palette;
}

const OUT = `stroke="rgba(16,11,8,.82)" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"`;
const NO = `stroke="none"`;

/** El SVG como data URL (para <img> y <image>). */
export const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** Icono de 64 × 64 de una pieza, fondo transparente (la ficha pone el color de la rareza). */
export function iconSvg({ kind, p }: IconSpec): string {
  const defs = `<defs>
<linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.light}"/><stop offset=".48" stop-color="${p.main}"/><stop offset="1" stop-color="${p.dark}"/></linearGradient>
<linearGradient id="h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.light}"/><stop offset=".55" stop-color="${p.main}"/><stop offset="1" stop-color="${p.dark}"/></linearGradient>
<linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".35" stop-color="${p.accent}"/><stop offset="1" stop-color="${p.accent}"/></linearGradient>
<radialGradient id="g" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#fff"/><stop offset=".28" stop-color="${p.accent}"/><stop offset="1" stop-color="${p.dark}"/></radialGradient>
</defs>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${defs}<g ${OUT}>${ICONS[kind](p)}</g></svg>`;
}

const gem = (cx: number, cy: number, r: number) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#g)"/><circle cx="${cx - r * 0.35}" cy="${cy - r * 0.38}" r="${r * 0.28}" fill="#fff" opacity=".8" ${NO}/>`;
const shine = (d: string) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.6"/>`;

const ICONS: Record<IconKind, (p: Palette) => string> = {
  // ───────── Cabeza ─────────
  hood: (p) =>
    `<path d="M5 59 C7 50 13 46 16 44 C13 28 20 9 32 7 C44 9 51 28 48 44 C51 46 57 50 59 59 Z" fill="url(#m)"/>
<path d="M21 44 C21 29 26 22 32 22 C38 22 43 29 43 44 C38 49 26 49 21 44 Z" fill="${p.dark}"/>
<path d="M16 44 C24 52 40 52 48 44" fill="none" stroke="${p.accent}" stroke-width="2"/>${gem(32, 52, 2.6)}
${shine("M19 30 C21 20 25 14 30 11")}`,
  witchhat: () =>
    `<ellipse cx="32" cy="47" rx="28" ry="8" fill="url(#m)"/>
<path d="M17 46 C21 34 25 22 29 13 C33 6 45 4 52 11 C45 11 40 15 38 23 C40 31 44 39 47 46 C38 50 26 50 17 46 Z" fill="url(#h)"/>
<path d="M18 42 C27 46 38 46 46 42 L47 46 C38 50 26 50 17 46 Z" fill="url(#a)"/>
${gem(32, 45, 3.2)}${shine("M24 38 C26 28 29 20 32 14")}`,
  headband: (p) =>
    `<path d="M8 46 C14 22 50 22 56 46 L50 48 C45 32 19 32 14 48 Z" fill="url(#m)"/>
${[0, 1, 2, 3, 4, 5, 6].map((i) => { const a = Math.PI * (0.92 - i * 0.14); return `<circle cx="${(32 + Math.cos(a) * 21).toFixed(1)}" cy="${(40 - Math.sin(a) * 15).toFixed(1)}" r="4.2" fill="${p.light}"/>`; }).join("")}
<path d="M14 48 C19 34 45 34 50 48" fill="none" stroke="${p.accent}" stroke-width="2.4"/>
<path d="M50 46 L58 52 L54 56 Z M50 46 L60 44 L58 50 Z" fill="${p.accent}"/>`,
  dragonhelm: (p) =>
    `<path d="M16 32 L3 18 L13 38 Z M48 32 L61 18 L51 38 Z" fill="url(#a)"/>
<path d="M14 44 C14 26 22 15 32 15 C42 15 50 26 50 44 L46 54 L18 54 Z" fill="url(#m)"/>
<path d="M32 15 L27 2 L36 9 Z" fill="url(#a)"/>
<path d="M19 37 H45 L42 43 H22 Z" fill="${p.dark}"/>
<path d="M32 18 V35" fill="none" stroke="${p.accent}" stroke-width="2"/>${shine("M20 34 C20 26 24 20 29 18")}`,
  ribbon: (p) =>
    `<path d="M30 34 L20 56 L26 52 L29 58 L33 36 Z M34 34 L44 56 L38 52 L35 58 L31 36 Z" fill="url(#h)"/>
<path d="M32 30 C22 14 6 16 8 30 C10 44 24 40 32 33 Z" fill="url(#m)"/>
<path d="M32 30 C42 14 58 16 56 30 C54 44 40 40 32 33 Z" fill="url(#m)"/>
<path d="M14 28 C16 22 22 22 27 27 M50 28 C48 22 42 22 37 27" fill="none" stroke="${p.dark}" stroke-width="1.2" opacity=".6"/>
<rect x="27" y="25" width="10" height="12" rx="3.5" fill="url(#a)"/>`,
  slime: (p) =>
    `<path d="M32 8 C35 16 54 24 54 42 C54 53 45 57 32 57 C19 57 10 53 10 42 C10 24 29 16 32 8 Z" fill="url(#m)"/>
<path d="M18 30 C21 24 26 21 29 20" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="3"/>
<ellipse cx="25" cy="38" rx="3" ry="4.2" fill="#1a1410" ${NO}/><ellipse cx="39" cy="38" rx="3" ry="4.2" fill="#1a1410" ${NO}/>
<path d="M23 46 C28 52 36 52 41 46" fill="${p.accent}"/>`,

  // ───────── Cuerpo ─────────
  tunic: (p) =>
    `<path d="M22 8 L13 12 L5 28 L13 33 L18 26 L18 57 L46 57 L46 26 L51 33 L59 28 L51 12 L42 8 C40 15 24 15 22 8 Z" fill="url(#m)"/>
<path d="M18 40 H46 V45 H18 Z" fill="url(#a)"/>${gem(32, 42.5, 2.6)}
<path d="M28 15 L32 26 L36 15" fill="none" stroke="${p.dark}" stroke-width="1.4"/>`,
  tracksuit: (p) =>
    `<path d="M22 8 L13 12 L5 30 L13 34 L18 26 L18 57 L46 57 L46 26 L51 34 L59 30 L51 12 L42 8 L32 13 Z" fill="url(#m)"/>
<path d="M8 27 L15 13 M11 30 L17 17 M56 27 L49 13 M53 30 L47 17" fill="none" stroke="${p.accent}" stroke-width="2"/>
<path d="M22 8 L32 13 L42 8 L40 4 L32 8 L24 4 Z" fill="${p.light}"/>
<path d="M32 13 V57" fill="none" stroke="${p.dark}" stroke-width="1.6"/><circle cx="32" cy="22" r="1.8" fill="${p.accent}"/>
<path d="M18 52 H46 V57 H18 Z" fill="${p.dark}"/>`,
  maid: (p) =>
    `<path d="M24 7 L16 11 L11 24 L17 26 L20 19 L22 30 L9 57 L55 57 L42 30 L44 19 L47 26 L53 24 L48 11 L40 7 C38 13 26 13 24 7 Z" fill="url(#m)"/>
<path d="M24 30 L17 55 L47 55 L40 30 Z" fill="${p.light}"/>
<path d="M17 55 Q20 59 23 55 Q26 59 29 55 Q32 59 35 55 Q38 59 41 55 Q44 59 47 55" fill="${p.light}"/>
<path d="M26 7 C28 12 36 12 38 7 L36 15 L32 13 L28 15 Z" fill="${p.light}"/>
<path d="M28 18 L32 22 L36 18 L32 25 Z" fill="${p.accent}"/>`,
  robe: (p) =>
    `<path d="M23 7 L12 13 L3 36 L13 39 L17 30 L14 57 L50 57 L47 30 L51 39 L61 36 L52 13 L41 7 C39 14 25 14 23 7 Z" fill="url(#m)"/>
<path d="M29 13 L32 57 M35 13 L32 57" fill="none" stroke="${p.accent}" stroke-width="2"/>
<path d="M3 36 L13 39 L14 34 L5 31 Z M61 36 L51 39 L50 34 L59 31 Z" fill="url(#a)"/>
<path d="M14 52 H50 V57 H14 Z" fill="url(#a)"/>${gem(32, 18, 2.8)}`,
  plate: (p) =>
    `<ellipse cx="13" cy="20" rx="10" ry="8" fill="url(#m)"/><ellipse cx="51" cy="20" rx="10" ry="8" fill="url(#m)"/>
<path d="M18 13 C24 9 40 9 46 13 L48 34 C46 46 40 54 32 57 C24 54 18 46 16 34 Z" fill="url(#h)"/>
<path d="M32 13 V54" fill="none" stroke="${p.dark}" stroke-width="1.2" opacity=".7"/>
<path d="M19 38 C26 41 38 41 45 38 M21 45 C27 48 37 48 43 45" fill="none" stroke="${p.dark}" stroke-width="1.4"/>
<path d="M26 20 L32 16 L38 20 L32 30 Z" fill="url(#a)"/>${shine("M22 16 C21 24 21 30 22 34")}`,
  lamellar: (p) =>
    `<path d="M6 14 H20 L22 34 H8 Z M58 14 H44 L42 34 H56 Z" fill="url(#m)"/>
<path d="M20 9 H44 L46 52 L32 58 L18 52 Z" fill="url(#h)"/>
${[17, 25, 33, 41].map((y) => `<path d="M${19 + (y - 9) * 0.04} ${y} H${45 - (y - 9) * 0.04}" fill="none" stroke="${p.accent}" stroke-width="2.4"/>`).join("")}
${[20, 27].map((y) => `<path d="M7 ${y} H21 M57 ${y} H43" fill="none" stroke="${p.accent}" stroke-width="1.8"/>`).join("")}
<path d="M26 9 L32 4 L38 9" fill="${p.accent}"/>`,

  // ───────── Manos ─────────
  glove: (p) =>
    `<path d="M20 58 V40 C14 34 12 28 15 25 C18 23 21 27 22 31 V14 C22 10 27 10 27 14 V28 V10 C27 6 32 6 32 10 V28 V11 C32 7 37 7 37 11 V29 V16 C37 12 42 12 42 16 V40 C42 48 40 52 40 58 Z" fill="url(#m)"/>
<path d="M27 28 V36 M32 28 V36 M37 29 V36" fill="none" stroke="${p.dark}" stroke-width="1" opacity=".6"/>
<path d="M18 50 H44 V58 H18 Z" fill="url(#a)"/>`,
  gauntlet: (p) =>
    `<path d="M16 60 L18 42 C12 36 11 29 15 26 C19 24 22 29 23 32 V15 C23 11 28 11 28 15 V10 C28 6 33 6 33 10 V12 C33 8 38 8 38 12 V17 C38 13 43 13 43 17 V40 L46 60 Z" fill="url(#h)"/>
<path d="M23 22 H43 M23 30 H43 M28 15 V30 M33 12 V30 M38 17 V30" fill="none" stroke="${p.dark}" stroke-width="1.1"/>
<path d="M14 48 C24 44 40 44 48 48 L46 60 H16 Z" fill="url(#a)"/>${gem(31, 38, 3)}`,
  bracer: (p) =>
    `<path d="M18 6 H46 L50 58 H14 Z" fill="url(#m)"/>
<path d="M22 14 L32 8 L42 14 L42 38 C42 46 32 52 32 52 C32 52 22 46 22 38 Z" fill="url(#a)"/>
<path d="M32 8 L35 1 L38 10 Z M22 22 L15 18 L22 28 Z M42 22 L49 18 L42 28 Z" fill="${p.light}"/>
${gem(32, 28, 4)}<path d="M14 52 H50" fill="none" stroke="${p.dark}" stroke-width="2"/>`,
  knuckle: (p) =>
    `<path d="M12 30 C12 20 20 16 26 18 C28 14 36 14 38 18 C44 16 52 20 52 30 V40 C52 52 44 58 32 58 C20 58 12 52 12 40 Z" fill="url(#m)"/>
<path d="M12 28 H52 V36 H12 Z" fill="url(#a)"/>
${[17, 27, 37, 47].map((x) => `<path d="M${x - 3} 28 L${x} 19 L${x + 3} 28 Z" fill="${p.light}"/>`).join("")}
<path d="M20 44 C26 48 38 48 44 44" fill="none" stroke="${p.dark}" stroke-width="1.6"/>`,

  // ───────── Pies ─────────
  boot: (p) =>
    `<path d="M20 6 H40 V38 C46 40 57 43 58 51 V57 H18 Z" fill="url(#m)"/>
<path d="M18 13 H42 V20 H18 Z" fill="url(#a)"/>
<path d="M18 52 H58 V58 H18 Z" fill="${p.dark}"/>${shine("M24 22 V44")}`,
  sandal: (p) =>
    `<path d="M6 50 C6 46 9 45 14 45 H52 C57 45 59 47 59 50 V53 C59 55 57 56 54 56 H10 C7 56 6 55 6 53 Z" fill="url(#m)"/>
<path d="M14 45 C16 34 22 30 26 30 M24 45 C26 36 32 32 38 33 M36 45 C38 38 44 36 50 40" fill="none" stroke="${p.accent}" stroke-width="3.2"/>
<path d="M20 31 C18 20 22 12 30 10 C34 14 34 22 30 30" fill="none" stroke="${p.accent}" stroke-width="2.6"/>
<path d="M8 51 H57" fill="none" stroke="${p.dark}" stroke-width="1.2"/>${gem(30, 10, 3)}`,
  wingboot: (p) =>
    `<path d="M22 8 H40 V38 C46 40 56 43 57 51 V57 H20 Z" fill="url(#m)"/>
<path d="M22 22 C12 18 6 10 4 4 C10 8 14 8 18 7 C14 11 14 14 16 15 C18 13 20 13 22 14 Z" fill="url(#a)"/>
<path d="M20 52 H57 V58 H20 Z" fill="${p.dark}"/><path d="M20 14 H40 V19 H20 Z" fill="${p.light}"/>`,
  greave: (p) =>
    `<path d="M18 4 H42 L41 38 C48 40 58 44 58 52 V58 H17 Z" fill="url(#h)"/>
<path d="M22 14 C22 8 38 8 38 14 L36 26 C34 30 26 30 24 26 Z" fill="url(#a)"/>
<path d="M18 36 H41 M17 46 H50" fill="none" stroke="${p.dark}" stroke-width="1.4"/>
${gem(30, 18, 3)}<path d="M17 53 H58 V58 H17 Z" fill="${p.dark}"/>`,

  // ───────── Armas ─────────
  sword: (p) =>
    `<g transform="rotate(45 32 32)"><path d="M29.5 2 H34.5 L35.5 40 L32 45 L28.5 40 Z" fill="url(#h)"/>
<path d="M32 4 V40" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1"/>
<rect x="20" y="40" width="24" height="5" rx="2.5" fill="url(#a)"/>
<rect x="29.5" y="45" width="5" height="12" rx="1.5" fill="${p.dark}"/>${gem(32, 59.5, 3.2)}</g>`,
  katana: (p) =>
    `<g transform="rotate(45 32 32)"><path d="M30 1 C33 10 34.5 24 34.5 42 H29.5 C29.5 24 30 12 30 1 Z" fill="url(#h)"/>
<path d="M33 8 C34 20 34 32 34 42" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".9"/>
<ellipse cx="32" cy="43.5" rx="7" ry="2.6" fill="url(#a)"/>
<rect x="29.5" y="45" width="5" height="16" rx="1.6" fill="${p.dark}"/>
<path d="M29.5 48 L34.5 51 M29.5 51 L34.5 54 M29.5 54 L34.5 57 M34.5 48 L29.5 51 M34.5 51 L29.5 54 M34.5 54 L29.5 57" fill="none" stroke="${p.accent}" stroke-width="1"/></g>`,
  staff: (p) =>
    `<g transform="rotate(30 32 32)"><rect x="30" y="18" width="4" height="46" rx="2" fill="url(#h)"/>
<path d="M32 22 C20 20 18 8 24 2 C24 10 28 13 32 13 C36 13 40 10 40 2 C46 8 44 20 32 22 Z" fill="url(#m)"/>
${gem(32, 12, 6)}<path d="M29 34 H35 M29 38 H35" fill="none" stroke="${p.accent}" stroke-width="1.8"/></g>`,
  wand: (p) =>
    `<g transform="rotate(35 32 32)"><rect x="30" y="22" width="4" height="38" rx="2" fill="url(#h)"/>
<path d="M32 4 L35 13 L44 14 L37 20 L39 29 L32 24 L25 29 L27 20 L20 14 L29 13 Z" fill="url(#a)"/>
<circle cx="32" cy="17" r="2.5" fill="#fff" ${NO}/><path d="M30 52 H34 V60 H30 Z" fill="${p.dark}"/></g>`,
  flail: (p) =>
    `<path d="M8 58 L22 44" fill="none" stroke="${p.dark}" stroke-width="5"/><path d="M8 58 L22 44" fill="none" stroke="${p.main}" stroke-width="3"/>
<path d="M22 44 Q26 36 32 34 Q36 32 38 28" fill="none" stroke="${p.accent}" stroke-width="1.8" stroke-dasharray="2.4 1.6"/>
${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = (i / 8) * Math.PI * 2; const x = 44 + Math.cos(a) * 15; const y = 20 + Math.sin(a) * 15; const x1 = 44 + Math.cos(a - 0.3) * 9; const y1 = 20 + Math.sin(a - 0.3) * 9; const x2 = 44 + Math.cos(a + 0.3) * 9; const y2 = 20 + Math.sin(a + 0.3) * 9; return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${x.toFixed(1)} ${y.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${p.light}"/>`; }).join("")}
<circle cx="44" cy="20" r="10" fill="url(#m)"/>${shine("M38 16 C39 13 41 12 43 11.5")}`,
  greatsword: (p) =>
    `<g transform="rotate(45 32 32)"><path d="M27 2 L32 -2 L37 2 L38 40 H26 Z" fill="url(#h)"/>
<path d="M32 2 V38" fill="none" stroke="${p.accent}" stroke-width="1.6"/>
<path d="M17 40 C22 38 42 38 47 40 L45 45 H19 Z" fill="url(#a)"/>
<rect x="29.5" y="45" width="5" height="13" rx="1.5" fill="${p.dark}"/>${gem(32, 60, 3)}${gem(32, 42.5, 2.4)}</g>`,

  // ───────── Escudos ─────────
  roundshield: (p) =>
    `<circle cx="32" cy="32" r="26" fill="url(#m)"/>
<path d="M14 18 V46 M23 9 V55 M32 6 V58 M41 9 V55 M50 18 V46" fill="none" stroke="${p.dark}" stroke-width="1" opacity=".6"/>
<circle cx="32" cy="32" r="26" fill="none" stroke="${p.accent}" stroke-width="3"/>
<circle cx="32" cy="32" r="7" fill="url(#a)"/>`,
  potlid: (p) =>
    `<ellipse cx="32" cy="38" rx="27" ry="17" fill="url(#m)"/>
<ellipse cx="32" cy="36" rx="20" ry="11" fill="none" stroke="${p.dark}" stroke-width="1.2" opacity=".7"/>
<path d="M24 30 C24 20 40 20 40 30" fill="none" stroke="${p.accent}" stroke-width="4"/>
${shine("M14 34 C18 28 26 25 32 24")}`,
  kite: (p) =>
    `<path d="M10 8 H54 V28 C54 44 42 54 32 60 C22 54 10 44 10 28 Z" fill="url(#m)"/>
<path d="M29 14 H35 V26 H46 V32 H35 V50 H29 V32 H18 V26 H29 Z" fill="url(#a)"/>
<path d="M10 8 H54" fill="none" stroke="${p.light}" stroke-width="2"/>`,
  crystalshield: () =>
    `<path d="M32 4 L54 16 L54 42 L32 60 L10 42 L10 16 Z" fill="url(#h)" fill-opacity=".9"/>
<path d="M32 4 L32 60 M10 16 L54 42 M54 16 L10 42" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1"/>
<path d="M32 18 L42 25 L42 37 L32 46 L22 37 L22 25 Z" fill="url(#a)" fill-opacity=".85"/>
<circle cx="24" cy="18" r="2" fill="#fff" ${NO}/><circle cx="45" cy="44" r="1.4" fill="#fff" ${NO}/>`,
  towershield: (p) =>
    `<path d="M12 6 H52 C54 6 55 7 55 9 V50 C55 54 44 60 32 60 C20 60 9 54 9 50 V9 C9 7 10 6 12 6 Z" fill="url(#m)"/>
<path d="M14 11 H50 V49 C50 52 42 56 32 56 C22 56 14 52 14 49 Z" fill="none" stroke="${p.accent}" stroke-width="2"/>
${[[17, 14], [47, 14], [17, 46], [47, 46]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="${p.light}"/>`).join("")}
<path d="M32 18 L40 30 L32 44 L24 30 Z" fill="url(#a)"/>${gem(32, 31, 3)}`,
  aegis: (p) =>
    `<circle cx="32" cy="32" r="27" fill="url(#m)"/>
${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<path d="M${(32 + Math.cos(a) * 12).toFixed(1)} ${(32 + Math.sin(a) * 12).toFixed(1)} L${(32 + Math.cos(a + 0.13) * 22).toFixed(1)} ${(32 + Math.sin(a + 0.13) * 22).toFixed(1)} L${(32 + Math.cos(a - 0.13) * 22).toFixed(1)} ${(32 + Math.sin(a - 0.13) * 22).toFixed(1)} Z" fill="url(#a)"/>`; }).join("")}
<circle cx="32" cy="32" r="10" fill="url(#h)"/>${gem(32, 32, 5)}
<circle cx="32" cy="32" r="27" fill="none" stroke="${p.light}" stroke-width="2"/>`,

  // ───────── Capas ─────────
  cape: (p) =>
    `<path d="M20 8 C26 12 38 12 44 8 L52 14 C54 30 58 46 57 58 C47 54 41 58 32 56 C23 58 17 54 7 58 C6 46 10 30 12 14 Z" fill="url(#m)"/>
<path d="M12 14 C10 30 7 46 7 58 C10 56 12 56 14 56 C14 42 16 26 19 12 Z M52 14 C54 30 57 46 57 58 C54 56 52 56 50 56 C50 42 48 26 45 12 Z" fill="${p.accent}" opacity=".85"/>
<path d="M20 8 C26 14 38 14 44 8" fill="none" stroke="${p.light}" stroke-width="2.2"/>${gem(32, 12, 3.4)}`,
  cloak: (p) =>
    `<path d="M22 6 C24 2 40 2 42 6 C48 10 49 18 46 22 C52 32 56 46 55 58 C40 55 24 55 9 58 C8 46 12 32 18 22 C15 18 16 10 22 6 Z" fill="url(#m)"/>
<path d="M24 22 C24 12 40 12 40 22 C38 26 26 26 24 22 Z" fill="${p.dark}"/>
<path d="M9 58 C24 55 40 55 55 58 L54 54 C40 51 24 51 10 54 Z" fill="url(#a)"/>
<path d="M32 26 V54" fill="none" stroke="${p.accent}" stroke-width="1.6"/>`,
  hagoromo: (p) =>
    `<path d="M6 12 C20 2 44 2 58 12 C50 14 46 20 46 28 C46 40 54 48 60 58 C50 56 44 50 40 40 C38 32 36 26 32 26 C28 26 26 32 24 40 C20 50 14 56 4 58 C10 48 18 40 18 28 C18 20 14 14 6 12 Z" fill="url(#m)" fill-opacity=".9"/>
<path d="M10 13 C22 6 42 6 54 13 M46 30 C47 42 52 50 57 56 M18 30 C17 42 12 50 7 56" fill="none" stroke="${p.accent}" stroke-width="1.6"/>
<circle cx="14" cy="22" r="1.5" fill="#fff" ${NO}/><circle cx="50" cy="20" r="1.2" fill="#fff" ${NO}/><circle cx="40" cy="48" r="1.3" fill="#fff" ${NO}/>`,

  // ───────── Amuletos ─────────
  pendant: (p) =>
    `${chain(p)}<circle cx="32" cy="40" r="12" fill="url(#m)"/>${gem(32, 40, 7.5)}`,
  teardrop: (p) =>
    `${chain(p)}<path d="M32 26 C38 36 44 42 44 49 C44 56 38 60 32 60 C26 60 20 56 20 49 C20 42 26 36 32 26 Z" fill="url(#g)"/>
<path d="M32 26 C38 36 44 42 44 49 C44 56 38 60 32 60 C26 60 20 56 20 49 C20 42 26 36 32 26 Z" fill="none" stroke="${p.light}" stroke-width="1.6"/>
<ellipse cx="27" cy="47" rx="2.4" ry="4" fill="#fff" opacity=".75" ${NO}/>`,
  feather: (p) =>
    `${chain(p)}<path d="M32 28 C46 32 50 46 40 60 C38 52 32 50 30 44 C28 38 28 32 32 28 Z" fill="url(#m)"/>
<path d="M32 28 C36 38 38 48 40 60" fill="none" stroke="${p.accent}" stroke-width="1.5"/>
<path d="M35 36 L42 34 M37 42 L45 41 M38 48 L45 49" fill="none" stroke="${p.dark}" stroke-width="1"/>`,
  badge: (p) =>
    `${chain(p)}<path d="M20 28 H44 V42 C44 51 38 56 32 59 C26 56 20 51 20 42 Z" fill="url(#m)"/>
<path d="M32 32 L34.5 39 L41.5 39.2 L36 43.5 L38 50.5 L32 46.5 L26 50.5 L28 43.5 L22.5 39.2 L29.5 39 Z" fill="url(#a)"/>`,
  shard: (p) =>
    `${chain(p)}<path d="M32 24 L42 34 L38 60 L26 60 L22 34 Z" fill="url(#h)" fill-opacity=".92"/>
<path d="M32 24 L32 60 M22 34 L38 60 M42 34 L26 60" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".9"/>
<path d="M28 30 L32 26" fill="none" stroke="#fff" stroke-width="2"/>`,
  charm: (p) =>
    `${chain(p)}<rect x="22" y="28" width="20" height="30" rx="4" fill="url(#m)"/>
<rect x="25" y="32" width="14" height="22" rx="2" fill="none" stroke="${p.accent}" stroke-width="1.4"/>
<path d="M28 38 H36 M32 36 V52 M28 44 H36 M29 50 L35 46" fill="none" stroke="${p.accent}" stroke-width="1.8"/>`,

  // ───────── Emblemas (con fondo: se recortan en el rombo de la cabecera) ─────────
  "crest-swords": (p) =>
    `${field(p)}<path d="M16 46 L46 14 M48 46 L18 14" fill="none" stroke="${p.light}" stroke-width="3.4"/>
<path d="M12 50 L18 44 M52 50 L46 44" fill="none" stroke="${p.accent}" stroke-width="4"/>
<path d="M22 22 H42 V34 C42 41 37 45 32 47 C27 45 22 41 22 34 Z" fill="url(#m)"/><path d="M32 26 V42 M26 32 H38" fill="none" stroke="${p.accent}" stroke-width="2"/>`,
  "crest-drop": (p) =>
    `${field(p)}<path d="M32 10 C38 22 46 30 46 40 C46 49 40 54 32 54 C24 54 18 49 18 40 C18 30 26 22 32 10 Z" fill="url(#m)"/>
<path d="M22 42 C26 38 30 46 34 42 C38 38 42 46 44 42" fill="none" stroke="${p.light}" stroke-width="2"/>
<ellipse cx="27" cy="34" rx="2.6" ry="5" fill="#fff" opacity=".7" ${NO}/>`,
  "crest-quarters": (p) =>
    `${field(p)}<path d="M16 12 H48 V34 C48 46 40 52 32 56 C24 52 16 46 16 34 Z" fill="url(#m)"/>
<path d="M32 12 V56 M16 30 H48" fill="none" stroke="${p.dark}" stroke-width="1.6"/>
<path d="M18 14 H32 V30 H18 Z M32 30 H48 V36 C47 44 40 50 32 54 Z" fill="${p.accent}" opacity=".85"/>
${star(25, 22, 4, p.light)}${star(40, 22, 4, p.accent)}`,
  "crest-eye": (p) =>
    `${field(p)}<circle cx="32" cy="32" r="20" fill="none" stroke="${p.accent}" stroke-width="2.4"/>
${star(32, 32, 19, "url(#m)")}<path d="M18 32 C24 24 40 24 46 32 C40 40 24 40 18 32 Z" fill="${p.dark}"/>
<circle cx="32" cy="32" r="5.5" fill="url(#a)"/><circle cx="30.5" cy="30.5" r="1.6" fill="#fff" ${NO}/>`,
  "crest-dragon": (p) =>
    `${field(p)}<path d="M32 50 C24 44 14 40 8 28 C16 30 20 30 24 26 C18 22 16 16 18 10 C24 16 28 18 32 18 C36 18 40 16 46 10 C48 16 46 22 40 26 C44 30 48 30 56 28 C50 40 40 44 32 50 Z" fill="url(#m)"/>
<path d="M32 18 L28 34 L32 46 L36 34 Z" fill="url(#a)"/><circle cx="29" cy="25" r="1.4" fill="${p.light}"/><circle cx="35" cy="25" r="1.4" fill="${p.light}"/>`,
  "crest-bird": (p) =>
    `${field(p)}<path d="M32 22 C26 14 16 10 6 12 C12 16 14 20 14 24 C18 22 22 24 24 28 C20 28 18 32 18 36 C24 32 28 34 32 38 C36 34 40 32 46 36 C46 32 44 28 40 28 C42 24 46 22 50 24 C50 20 52 16 58 12 C48 10 38 14 32 22 Z" fill="url(#m)"/>
<path d="M32 38 L26 54 L32 50 L38 54 Z" fill="url(#a)"/><circle cx="32" cy="24" r="3.4" fill="url(#a)"/>`,
};

function chain(p: Palette) {
  return `<path d="M14 4 C14 22 26 28 32 28 C38 28 50 22 50 4" fill="none" stroke="${p.accent}" stroke-width="1.8" stroke-dasharray="2.6 1.8"/>`;
}
function field(p: Palette) {
  return `<rect x="-2" y="-2" width="68" height="68" fill="${p.dark}" ${NO}/><circle cx="32" cy="32" r="30" fill="${p.main}" opacity=".35" ${NO}/>`;
}
function star(cx: number, cy: number, r: number, fill: string) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`;
  });
  return `<polygon points="${pts.join(" ")}" fill="${fill}"/>`;
}

// ───────────── Fondos del menú: escenas a pantalla completa ─────────────

export const SCENES = ["meadow", "forest", "mansion", "library", "explosion", "skyislands", "starsea"] as const;
export type Scene = (typeof SCENES)[number];

export interface BackdropSpec {
  scene: Scene;
  /** Cielo de arriba abajo. */
  sky: [string, string, string];
  /** Cordilleras de lejos a cerca. */
  hills: [string, string, string];
  /** Luz principal (sol, luna, explosión, cristal). */
  glow: string;
}

const W = 1600;
const H = 1000;

/** Una escena de 1600 × 1000 que se recorta para llenar la pantalla (o el icono). */
export function backdropSvg(spec: BackdropSpec, seed: string): string {
  const rnd = seededRandom(seed);
  const [s0, s1, s2] = spec.sky;
  const defs = `<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s0}"/><stop offset=".55" stop-color="${s1}"/><stop offset="1" stop-color="${s2}"/></linearGradient>
<radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".18" stop-color="${spec.glow}" stop-opacity=".9"/><stop offset=".5" stop-color="${spec.glow}" stop-opacity=".25"/><stop offset="1" stop-color="${spec.glow}" stop-opacity="0"/></radialGradient>
<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>
</defs>`;
  const body = SCENE_DRAW[spec.scene](spec, rnd);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${defs}<rect width="${W}" height="${H}" fill="url(#sky)"/>${body}<rect y="${H * 0.55}" width="${W}" height="${H * 0.45}" fill="url(#fade)"/></svg>`;
}

type Rnd = () => number;

function stars(rnd: Rnd, n: number, maxY: number, color = "#fff") {
  let out = "";
  for (let i = 0; i < n; i++) {
    const r = rnd() < 0.08 ? 2.2 + rnd() * 1.6 : 0.7 + rnd() * 1.3;
    out += `<circle cx="${(rnd() * W).toFixed(0)}" cy="${(rnd() * maxY).toFixed(0)}" r="${r.toFixed(1)}" fill="${color}" opacity="${(0.35 + rnd() * 0.65).toFixed(2)}"/>`;
  }
  return out;
}

/** Cordillera: una línea de crestas con ruido, cerrada por abajo. */
function ridge(rnd: Rnd, base: number, amp: number, step: number, fill: string, sharp = 0.5) {
  let y = base;
  let d = `M0 ${H} L0 ${base}`;
  for (let x = 0; x <= W + step; x += step) {
    y += (rnd() - 0.5) * amp * sharp;
    y = Math.max(base - amp, Math.min(base + amp * 0.4, y + (base - y) * 0.15));
    d += ` L${x} ${y.toFixed(0)}`;
  }
  return `<path d="${d} L${W} ${H} Z" fill="${fill}"/>`;
}

function pines(rnd: Rnd, n: number, baseY: number, h: number, fill: string) {
  let out = "";
  for (let i = 0; i < n; i++) {
    const x = rnd() * W;
    const hh = h * (0.6 + rnd() * 0.6);
    const w = hh * 0.36;
    const y = baseY + rnd() * 40;
    out += `<path d="M${x.toFixed(0)} ${(y - hh).toFixed(0)} L${(x + w).toFixed(0)} ${y.toFixed(0)} L${(x - w).toFixed(0)} ${y.toFixed(0)} Z" fill="${fill}"/>`;
  }
  return out;
}

function sun(x: number, y: number, r: number) {
  return `<circle cx="${x}" cy="${y}" r="${r * 4}" fill="url(#glow)"/>`;
}

const SCENE_DRAW: Record<Scene, (s: BackdropSpec, rnd: Rnd) => string> = {
  // Pradera al atardecer, con ranas gigantes a lo lejos.
  meadow: (s, rnd) =>
    sun(1150, 560, 70) +
    ridge(rnd, 600, 90, 50, s.hills[0]) +
    [260, 980, 1330].map((x, i) => `<g fill="${s.hills[1]}"><ellipse cx="${x}" cy="${640 - i * 6}" rx="${46 - i * 8}" ry="${34 - i * 6}"/><circle cx="${x - 20 + i * 3}" cy="${612 - i * 8}" r="${10 - i * 1.5}"/><circle cx="${x + 20 - i * 3}" cy="${612 - i * 8}" r="${10 - i * 1.5}"/></g>`).join("") +
    ridge(rnd, 700, 60, 80, s.hills[1], 0.3) +
    ridge(rnd, 830, 40, 100, s.hills[2], 0.25),
  // Bosque de noche, con luciérnagas.
  forest: (s, rnd) =>
    stars(rnd, 140, 420) +
    sun(380, 210, 38) +
    ridge(rnd, 520, 110, 40, s.hills[0]) +
    pines(rnd, 70, 640, 220, s.hills[1]) +
    pines(rnd, 40, 820, 340, s.hills[2]) +
    Array.from({ length: 60 }, () => `<circle cx="${(rnd() * W).toFixed(0)}" cy="${(560 + rnd() * 400).toFixed(0)}" r="${(1.5 + rnd() * 2.5).toFixed(1)}" fill="${s.glow}" opacity="${(0.4 + rnd() * 0.6).toFixed(2)}"/>`).join(""),
  // Mansión con las ventanas encendidas bajo la luna.
  mansion: (s, rnd) =>
    stars(rnd, 220, 520) +
    sun(1240, 190, 46) +
    ridge(rnd, 640, 70, 60, s.hills[0]) +
    mansionSil(s, rnd) +
    ridge(rnd, 860, 30, 90, s.hills[2], 0.2),
  // Biblioteca prohibida: estanterías y polvo dorado.
  library: (s, rnd) => libraryScene(s, rnd),
  // Una explosión en el horizonte.
  explosion: (s, rnd) =>
    stars(rnd, 90, 360) +
    `<circle cx="820" cy="560" r="520" fill="url(#glow)"/>` +
    `<ellipse cx="820" cy="560" rx="320" ry="60" fill="none" stroke="${s.glow}" stroke-width="10" opacity=".55"/>` +
    `<ellipse cx="820" cy="560" rx="460" ry="90" fill="none" stroke="#fff" stroke-width="3" opacity=".35"/>` +
    `<path d="M760 560 C740 420 700 360 640 330 C700 250 940 250 1000 330 C940 360 900 420 880 560 Z" fill="${s.glow}" opacity=".55"/>` +
    ridge(rnd, 640, 50, 70, s.hills[0]) +
    ridge(rnd, 760, 40, 90, s.hills[1], 0.3) +
    ridge(rnd, 880, 30, 110, s.hills[2], 0.25),
  // Islas que flotan sobre las nubes.
  skyislands: (s, rnd) =>
    sun(300, 260, 60) +
    clouds(rnd, 760, "#ffffff", 0.5) +
    [
      [520, 420, 1.0],
      [1120, 300, 0.75],
      [1380, 520, 0.5],
      [220, 560, 0.45],
    ]
      .map(([x, y, k]) => island(x, y, k, s))
      .join("") +
    clouds(rnd, 900, "#ffffff", 0.75),
  // Un mar de estrellas con un cristal que brilla.
  starsea: (s, rnd) =>
    stars(rnd, 360, 1000) +
    `<path d="M0 640 C300 600 500 700 800 640 C1100 580 1300 690 1600 630 L1600 1000 L0 1000 Z" fill="${s.hills[1]}" opacity=".75"/>` +
    `<circle cx="800" cy="450" r="330" fill="url(#glow)"/>` +
    `<path d="M800 250 L880 430 L800 640 L720 430 Z" fill="${s.glow}" opacity=".9"/>` +
    `<path d="M800 250 L800 640 M720 430 L880 430" stroke="#fff" stroke-opacity=".7" stroke-width="3"/>` +
    `<path d="M800 660 L850 760 L800 860 L750 760 Z" fill="${s.glow}" opacity=".25"/>` +
    stars(rnd, 120, 1000, s.glow),
};

function mansionSil(s: BackdropSpec, rnd: Rnd) {
  const f = s.hills[1];
  let out = `<g fill="${f}">
<rect x="520" y="430" width="560" height="300"/>
<path d="M500 440 L800 330 L1100 440 Z"/>
<rect x="440" y="480" width="110" height="250"/><path d="M430 490 L495 420 L560 490 Z"/>
<rect x="1050" y="480" width="110" height="250"/><path d="M1040 490 L1105 420 L1170 490 Z"/>
<rect x="770" y="300" width="60" height="140"/><path d="M760 305 L800 240 L840 305 Z"/>
</g>`;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 9; col++) {
      if (rnd() < 0.3) continue;
      const x = 548 + col * 58;
      const y = 470 + row * 80;
      out += `<rect x="${x}" y="${y}" width="22" height="38" rx="10" fill="${s.glow}" opacity="${(0.55 + rnd() * 0.45).toFixed(2)}"/>`;
    }
  }
  return out;
}

function libraryScene(s: BackdropSpec, rnd: Rnd) {
  let out = `<rect width="${W}" height="${H}" fill="${s.hills[0]}"/>`;
  out += `<circle cx="800" cy="380" r="420" fill="url(#glow)" opacity=".7"/>`;
  const colors = [s.hills[1], s.glow, "#7a2e2a", "#2f4a6e", "#3e5a34", "#6b4a2a", "#5a3d6e"];
  for (let shelf = 0; shelf < 6; shelf++) {
    const y = 80 + shelf * 150;
    out += `<rect x="0" y="${y + 120}" width="${W}" height="18" fill="${s.hills[2]}"/>`;
    let x = 0;
    while (x < W) {
      const w = 18 + rnd() * 26;
      const h = 70 + rnd() * 46;
      const lean = rnd() < 0.06;
      out += `<rect x="${x.toFixed(0)}" y="${(y + 120 - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="${colors[Math.floor(rnd() * colors.length)]}" opacity=".85"${lean ? ` transform="rotate(8 ${x.toFixed(0)} ${y + 120})"` : ""}/>`;
      x += w + 2 + (rnd() < 0.1 ? 30 : 0);
    }
  }
  out += Array.from({ length: 90 }, () => `<circle cx="${(rnd() * W).toFixed(0)}" cy="${(rnd() * H).toFixed(0)}" r="${(1 + rnd() * 2).toFixed(1)}" fill="${s.glow}" opacity="${(0.3 + rnd() * 0.6).toFixed(2)}"/>`).join("");
  out += `<rect x="0" y="0" width="${W}" height="${H}" fill="${s.sky[0]}" opacity=".35"/>`;
  return out;
}

function clouds(rnd: Rnd, y: number, fill: string, opacity: number) {
  let out = "";
  for (let i = 0; i < 14; i++) {
    const x = rnd() * W;
    const r = 60 + rnd() * 90;
    out += `<ellipse cx="${x.toFixed(0)}" cy="${(y + rnd() * 80).toFixed(0)}" rx="${(r * 2.2).toFixed(0)}" ry="${r.toFixed(0)}" fill="${fill}" opacity="${opacity}"/>`;
  }
  return out;
}

function island(x: number, y: number, k: number, s: BackdropSpec) {
  const w = 300 * k;
  return `<g>
<path d="M${x - w} ${y} C${x - w * 0.6} ${y + 150 * k} ${x - w * 0.2} ${y + 260 * k} ${x} ${y + 300 * k} C${x + w * 0.2} ${y + 250 * k} ${x + w * 0.6} ${y + 150 * k} ${x + w} ${y} Z" fill="${s.hills[2]}"/>
<ellipse cx="${x}" cy="${y}" rx="${w}" ry="${34 * k}" fill="${s.hills[1]}"/>
<path d="M${x - w * 0.5} ${y - 4} L${x - w * 0.42} ${y - 90 * k} L${x - w * 0.34} ${y - 4} Z M${x + w * 0.1} ${y - 4} L${x + w * 0.2} ${y - 150 * k} L${x + w * 0.3} ${y - 4} Z" fill="${s.hills[0]}"/>
<rect x="${x + w * 0.16}" y="${y - 120 * k}" width="${16 * k}" height="${30 * k}" fill="${s.glow}" opacity=".85"/>
<path d="M${x + w * 0.7} ${y + 10} V${y + 260 * k}" stroke="#dff3ff" stroke-width="${6 * k}" opacity=".6"/>
</g>`;
}

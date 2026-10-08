// Personajes vivos (features/living): cómo se mueve cada personaje del menú. Puro: sin React,
// Zustand ni DOM. Lo importa el dominio (applyStyleEvent), así que no puede importar el índice.
//
// El estilo de un personaje se guarda como un parche sobre los valores por defecto: lo que
// el jugador no ha tocado sigue al valor por defecto, aunque este cambie en otra versión.

import type { LivingEventBody } from "./events";

/** Intensidad de un movimiento: 0 quieto, 1 suave, 2 normal, 3 intenso. */
export type Level = 0 | 1 | 2 | 3;
export const LEVELS: readonly Level[] = [0, 1, 2, 3];

/** Partículas alrededor del personaje. */
export type Particles = "none" | "dust" | "sparkles" | "petals" | "embers" | "snow";
export const PARTICLES: readonly Particles[] = ["none", "dust", "sparkles", "petals", "embers", "snow"];

/** Color del aura: un token de theme.css (AURA_TOKEN), nunca un color suelto. */
export type Aura = "none" | "gold" | "jade" | "azure" | "amethyst" | "crimson" | "amber" | "aqua";
export const AURAS: readonly Aura[] = ["none", "gold", "jade", "azure", "amethyst", "crimson", "amber", "aqua"];
export const AURA_TOKEN: Record<Exclude<Aura, "none">, string> = {
  gold: "var(--gold)",
  jade: "var(--r-uncommon)",
  azure: "var(--r-rare)",
  amethyst: "var(--r-epic)",
  crimson: "var(--r-mythic)",
  amber: "var(--r-legendary)",
  aqua: "var(--stamp)",
};

/** Cómo entra al abrir el menú: deslizándose (la de siempre) o como un personaje que sale en un gacha. */
export type Entrance = "slide" | "gacha";
export const ENTRANCES: readonly Entrance[] = ["slide", "gacha"];

export interface CharacterStyle {
  /** Respiración: el pecho sube y baja, los pies quietos. */
  breath: Level;
  /** Balanceo: la parte de arriba se mece desde la cadera. */
  sway: Level;
  /** Viento: ondea lo que sobresale a los lados (pelo, capa, falda). Solo en imágenes fijas. */
  wind: Level;
  aura: Aura;
  /** Barrido de luz que cruza la silueta de vez en cuando. */
  shine: boolean;
  particles: Particles;
  entrance: Entrance;
  /** Bordes suaves: funde los bordes de una imagen o un vídeo con fondo. */
  fade: boolean;
}

export const DEFAULT_STYLE: CharacterStyle = {
  breath: 2,
  sway: 1,
  wind: 1,
  aura: "gold",
  shine: true,
  particles: "sparkles",
  entrance: "slide",
  fade: false,
};

/** Lo que el jugador ha cambiado de un personaje; el resto, por defecto. */
export type StylePatch = Partial<CharacterStyle>;

/** Estilos por personaje (de serie o añadido). */
export type StylesAcc = Map<string, StylePatch>;
export const newStylesAcc = (): StylesAcc => new Map();

const oneOf = <T>(list: readonly T[], v: unknown): v is T => list.includes(v as T);

/** Solo los campos válidos de un parche (los de un equipo más nuevo o mal formados se ignoran). */
export function cleanPatch(p: unknown): StylePatch {
  if (!p || typeof p !== "object") return {};
  const o = p as Record<string, unknown>;
  const out: StylePatch = {};
  if (oneOf(LEVELS, o.breath)) out.breath = o.breath;
  if (oneOf(LEVELS, o.sway)) out.sway = o.sway;
  if (oneOf(LEVELS, o.wind)) out.wind = o.wind;
  if (oneOf(AURAS, o.aura)) out.aura = o.aura;
  if (typeof o.shine === "boolean") out.shine = o.shine;
  if (oneOf(PARTICLES, o.particles)) out.particles = o.particles;
  if (oneOf(ENTRANCES, o.entrance)) out.entrance = o.entrance;
  if (typeof o.fade === "boolean") out.fade = o.fade;
  return out;
}

/**
 * Aplica un evento de estilo. `exists` dice si el personaje existe (los de serie, siempre;
 * los añadidos, mientras no se quiten): un estilo de uno quitado o desconocido se ignora.
 */
export function applyStyleEvent(acc: StylesAcc, e: LivingEventBody, exists: (id: string) => boolean): void {
  if (typeof e.characterId !== "string" || !e.characterId || !exists(e.characterId)) return;
  switch (e.type) {
    case "character_style_set": {
      const patch = cleanPatch(e.style);
      if (!Object.keys(patch).length) return;
      acc.set(e.characterId, { ...acc.get(e.characterId), ...patch });
      return;
    }
    case "character_style_reset":
      acc.delete(e.characterId);
      return;
  }
}

/** El estilo de un personaje: lo que cambió el jugador sobre los valores por defecto. */
export const styleOf = (styles: ReadonlyMap<string, StylePatch>, id: string | undefined): CharacterStyle => ({
  ...DEFAULT_STYLE,
  ...(id ? styles.get(id) : undefined),
});

/** ¿Tiene algo cambiado? (para el botón «Restablecer»). */
export const isCustomized = (styles: ReadonlyMap<string, StylePatch>, id: string) => Object.keys(styles.get(id) ?? {}).length > 0;

/** Amplitud de cada intensidad, para el shader y la animación CSS. */
export const LEVEL_AMOUNT: Record<Level, number> = { 0: 0, 1: 0.55, 2: 1, 3: 1.7 };

// Menú de opciones (features/menu): lo que se calcula para pintarlo y los personajes que
// añade el jugador. Puro: sin React, Zustand ni DOM, y el tiempo entra como parámetro. Lo
// importa el dominio (applyCharacterEvent), así que no puede importar el índice.

import type { QuestState } from "../../domain/types";
import { seededRandom } from "../../lib/id";
import type { MenuEventBody } from "./events";

/** Parte del día: elige el saludo del personaje del menú. */
export type Daypart = "morning" | "afternoon" | "evening" | "night";

/** Parte del día de una hora local (0–23): mañana de 6 a 13, tarde hasta las 20, noche hasta las 24 y madrugada. */
export function daypart(hour: number): Daypart {
  if (hour >= 6 && hour < 13) return "morning";
  if (hour >= 13 && hour < 20) return "afternoon";
  if (hour >= 20) return "evening";
  return "night";
}

/**
 * Quests en curso, la última aceptada primero: la primera es la «actual» de la tarjeta grande
 * del menú. Con la misma hora de aceptación, por id (el mismo orden en todos los equipos).
 */
export function activeQuests(quests: Iterable<QuestState>): QuestState[] {
  return [...quests]
    .filter((q) => q.status === "active")
    .sort((a, b) => (b.acceptedAt ?? 0) - (a.acceptedAt ?? 0) || (a.id < b.id ? -1 : 1));
}

const DAY = 86_400_000;
const dayStart = (t: number) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/**
 * Días de calendario (hora local) que faltan hasta `endsAt`, como mínimo 1: «el escaparate
 * cambia en 3 días». Se cuentan medianoches y no milisegundos: la semana del cambio de hora
 * dura 167 o 169 horas, y el lunes a primera hora daría 8 días.
 */
export const daysUntil = (endsAt: number, now: number) => Math.max(1, Math.round((dayStart(endsAt) - dayStart(now)) / DAY));

// ───────────── Personajes del menú ─────────────
// Los de serie salen de los .webp de src/features/menu/characters/ (characters.ts, no son
// eventos). Los que añade el jugador son eventos (character_added / character_removed),
// con la imagen en el almacén de binarios, como el fondo del mercader: se sincronizan.

/** Imagen grande en el almacén de binarios (src/storage/blobStore.ts). En el evento, solo la referencia. */
export interface CharacterArt {
  blobId: string;
  mime: string;
  size: number;
}

/** Un personaje añadido por el jugador. */
export interface CharacterDef {
  id: string;
  name: string;
  art: CharacterArt;
  /** Miniatura (unos 160 px de alto) como data URL, para el selector mientras llega la imagen. */
  thumb?: string;
  createdAt: number;
}

export const CHARACTER_LIMITS = { name: 30 } as const;
/** Prefijo de los personajes de serie: un evento no puede crear ni quitar uno de ellos. */
export const BUILTIN_PREFIX = "builtin:";

export interface CharactersAcc {
  list: Map<string, CharacterDef>;
  /** Ids quitados: un `character_added` repetido no los resucita. */
  deleted: Set<string>;
}

export const newCharactersAcc = (): CharactersAcc => ({ list: new Map(), deleted: new Set() });

const validCharacter = (c: CharacterDef | undefined): c is CharacterDef =>
  !!c &&
  typeof c.id === "string" &&
  c.id !== "" &&
  !c.id.startsWith(BUILTIN_PREFIX) &&
  typeof c.art?.blobId === "string" &&
  c.art.blobId !== "";

/** Aplica un evento de los personajes. Las guardas ignoran los imposibles, como project(). */
export function applyCharacterEvent(acc: CharactersAcc, e: MenuEventBody): void {
  switch (e.type) {
    case "character_added": {
      const c = e.character;
      if (!validCharacter(c) || acc.list.has(c.id) || acc.deleted.has(c.id)) return;
      const name = typeof c.name === "string" ? c.name.trim().slice(0, CHARACTER_LIMITS.name) : "";
      acc.list.set(c.id, { ...c, name: name || "?" });
      return;
    }
    case "character_removed":
      if (acc.list.delete(e.characterId)) acc.deleted.add(e.characterId);
      return;
  }
}

/** Binarios que usan los personajes (para no borrarlos al limpiar el almacén ni dejar de subirlos). */
export function characterBlobIds(list: Iterable<CharacterDef>): Set<string> {
  const ids = new Set<string>();
  for (const c of list) if (c.art?.blobId) ids.add(c.art.blobId);
  return ids;
}

// ───────────── Rotación diaria ─────────────

/** Número del día local (días desde el 1-1-1970 en el calendario, sin horas): cambia a medianoche. */
export function dayNumber(now: number): number {
  const d = new Date(now);
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY);
}

/** Barajado de una vuelta con su número como semilla: el mismo en todos los equipos. */
function shuffled(ids: readonly string[], cycle: number): string[] {
  const rnd = seededRandom(`menu-cast:${cycle}`);
  const out = [...ids];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Orden de los personajes en la vuelta `cycle`: al azar, pero sin repetir el que cerró la
 * vuelta anterior (con tres o más, el primero se cambia por el segundo; eso nunca toca el
 * último, así que la vuelta anterior no cambia por arreglar esta).
 */
export function rotationOrder(ids: readonly string[], cycle: number): string[] {
  const sorted = [...new Set(ids)].sort();
  if (sorted.length <= 2) return sorted;
  const order = shuffled(sorted, cycle);
  const prevLast = shuffled(sorted, cycle - 1)[sorted.length - 1];
  if (order[0] === prevLast) [order[0], order[1]] = [order[1], order[0]];
  return order;
}

/**
 * El personaje de un día: los días se agrupan en vueltas de tantos días como personajes y,
 * en cada vuelta, salen todos una vez en un orden al azar (rotationOrder). Añadir o quitar
 * un personaje cambia el tamaño de la vuelta y, con él, el orden desde ese día.
 */
export function characterOfDay(ids: readonly string[], day: number): string | undefined {
  const n = new Set(ids).size;
  if (n === 0) return undefined;
  const cycle = Math.floor(day / n);
  return rotationOrder(ids, cycle)[day - cycle * n];
}

/** Lo elegido a mano en un equipo para un día (`day` = número del día). No cambia la rotación. */
export interface CharacterPick {
  day: number;
  id: string;
}

/** El personaje que se enseña hoy: el elegido a mano para hoy, si existe, o el de la rotación. */
export function shownCharacter(ids: readonly string[], now: number, pick?: CharacterPick): string | undefined {
  const day = dayNumber(now);
  if (pick && pick.day === day && ids.includes(pick.id)) return pick.id;
  return characterOfDay(ids, day);
}

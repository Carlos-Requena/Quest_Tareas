// Personajes del menú: los de serie y los que ha añadido el jugador, en una sola lista.
// Los de serie son los .webp de public/menu/ (el nombre del archivo es su id): para añadir
// uno a la app basta con dejar el archivo ahí. Los lista Vite al compilar (plugin
// menuCharacters de vite.config.ts), porque JavaScript no puede leer una carpeta.

import FILES from "virtual:menu-characters";
import type { CharacterDef } from "./model";
import { BUILTIN_PREFIX } from "./model";

const BASE = import.meta.env.BASE_URL;

/** Un personaje listo para pintar: de serie (con `src`) o del jugador (con su binario y miniatura). */
export interface MenuCharacter {
  id: string;
  /** De serie: el nombre del archivo, para buscar su nombre traducido (menu.cast.names). */
  key?: string;
  /** Del jugador: el nombre que se le puso al añadirlo. */
  name?: string;
  src?: string;
  blobId?: string;
  thumb?: string;
  /** Del jugador: tipo del archivo (una imagen o un vídeo) y si se mueve por sí mismo. */
  mime?: string;
  animated?: boolean;
  builtin: boolean;
}

export const BUILTIN_CHARACTERS: MenuCharacter[] = FILES.map((file) => {
  const key = file.replace(/\.webp$/i, "");
  return { id: `${BUILTIN_PREFIX}${key}`, key, src: `${BASE}menu/${file}`, builtin: true };
});

/** Los de serie primero y después los del jugador, por orden de llegada. */
export function allCharacters(added: Iterable<CharacterDef>): MenuCharacter[] {
  const mine = [...added]
    .sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1))
    .map((c): MenuCharacter => ({ id: c.id, name: c.name, blobId: c.art.blobId, thumb: c.thumb, mime: c.art.mime, animated: !!c.art.animated, builtin: false }));
  return [...BUILTIN_CHARACTERS, ...mine];
}

/** «kazuma» → «Kazuma», «mihari_mahiro» → «Mihari Mahiro»: el nombre de un archivo sin traducción. */
export const prettyName = (key: string) =>
  key
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase());

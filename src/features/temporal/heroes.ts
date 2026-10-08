// Ilustraciones de «Encargo cumplido», una carpeta por tipo de encargo (summons, delivery,
// hunt, scout, gathering). Las de serie son las imágenes de public/temporal/<tipo>/: para
// añadir una basta con dejar el archivo (.webp o .png, mejor con fondo transparente) en la
// carpeta de su tipo; las lista Vite al compilar (plugin temporalHeroes de vite.config.ts),
// porque JavaScript no puede leer una carpeta. Las del jugador se añaden desde la ventana de
// personalización (features/customize) y son eventos (TemporalArt).

import FILES from "virtual:temporal-heroes";
import { prettyName } from "../menu/characters";
import { TEMPORAL_KINDS, artsOf, heroesByKind, pickHero, type TemporalArt, type TemporalKind } from "./model";

const BASE = import.meta.env.BASE_URL;
/** Prefijo de las de serie: su id es `builtin:<tipo>/<archivo>`. */
const BUILTIN_PREFIX = "builtin:";

/** Una ilustración lista para pintar: de serie (con `src`) o del jugador (con su binario y miniatura). */
export interface Illustration {
  id: string;
  kind: TemporalKind;
  /** De serie, el de su archivo («kazuma» → «Kazuma»); del jugador, el que se le puso. */
  name: string;
  src?: string;
  blobId?: string;
  thumb?: string;
  builtin: boolean;
}

const byKind = heroesByKind(FILES);

export const BUILTIN_ILLUSTRATIONS: Illustration[] = TEMPORAL_KINDS.flatMap((kind) =>
  byKind[kind].map((file) => ({
    id: `${BUILTIN_PREFIX}${file}`,
    kind,
    name: prettyName(file.slice(file.indexOf("/") + 1).replace(/\.[^.]+$/, "")),
    src: encodeURI(`${BASE}temporal/${file}`),
    builtin: true,
  })),
);

/** Las ilustraciones de un tipo: las de serie primero y después las del jugador, por orden de llegada. */
export function illustrationsOf(kind: TemporalKind, arts: Iterable<TemporalArt>): Illustration[] {
  const mine = artsOf(arts, kind).map((a): Illustration => ({ id: a.id, kind, name: a.name, blobId: a.blobId, thumb: a.thumb, builtin: false }));
  return [...BUILTIN_ILLUSTRATIONS.filter((i) => i.kind === kind), ...mine];
}

/** Una ilustración al azar del tipo; sin ninguna, `undefined` (la silueta del aventurero). */
export function heroFor(kind: TemporalKind, arts: Iterable<TemporalArt>): Illustration | undefined {
  return pickHero(illustrationsOf(kind, arts), Math.random());
}

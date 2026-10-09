// Binarios en uso: los archivos del almacén (src/storage/blobStore.ts) a los que apunta algún
// dato del juego. Lo comparten los adjuntos de los encargos, sus ilustraciones, el mercader,
// los personajes del menú y las imágenes nítidas de los objetos: antes de borrar un binario hay que comprobar que no lo usa
// ninguno, y la sincronización sube y baja justo estos.

import type { GameState } from "./types";
import { artBlobIds, liveBlobIds } from "../features/temporal/model";
import { gearBlobIds } from "../features/merchant/model";
import { characterBlobIds } from "../features/menu/model";
import { itemBlobIds } from "../features/items/model";

export function blobsInUse(state: Pick<GameState, "temporals" | "temporalArts" | "gear" | "characters" | "items">): Set<string> {
  return new Set([
    ...liveBlobIds(state.temporals.values()),
    ...artBlobIds(state.temporalArts.values()),
    ...gearBlobIds(state.gear.values()),
    ...characterBlobIds(state.characters.values()),
    ...itemBlobIds(state.items.values()),
  ]);
}

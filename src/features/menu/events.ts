// Eventos de los personajes del menú. Se suman a la unión EventBody de src/domain/events.ts.
// La imagen va en el almacén de binarios: en el evento, solo su referencia y una miniatura.

import type { CharacterDef } from "./model";

export type MenuEventBody =
  | { type: "character_added"; character: CharacterDef }
  | { type: "character_removed"; characterId: string };

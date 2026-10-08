// Eventos de los personajes del menú y de lo que dicen. Se suman a la unión EventBody de
// src/domain/events.ts. La imagen va en el almacén de binarios: en el evento, solo su
// referencia y una miniatura.

import type { CharacterDef, VoiceLine } from "./model";

export type MenuEventBody =
  | { type: "character_added"; character: CharacterDef }
  | { type: "character_removed"; characterId: string }
  | { type: "voice_line_added"; line: VoiceLine }
  | { type: "voice_line_updated"; lineId: string; text: string }
  | { type: "voice_line_removed"; lineId: string };

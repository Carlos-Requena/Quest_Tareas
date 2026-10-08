// Eventos del estilo de los personajes vivos. Se suman a la unión EventBody de
// src/domain/events.ts. Un parche por cambio: dos equipos que tocan cosas distintas del
// mismo personaje no se pisan.

import type { StylePatch } from "./model";

export type LivingEventBody =
  | { type: "character_style_set"; characterId: string; style: StylePatch }
  | { type: "character_style_reset"; characterId: string };

// Eventos de los objetos. Se suman a la unión EventBody de src/domain/events.ts.
// Los drops NO son un evento aparte: viajan dentro de `quest_completed` para que,
// si dos dispositivos completan la misma quest, la guarda descarte también sus drops.

import type { ItemDef, ItemPatch } from "./model";

export type ItemEventBody =
  | { type: "item_created"; item: ItemDef }
  | { type: "item_updated"; itemId: string; patch: ItemPatch }
  | { type: "item_deleted"; itemId: string };

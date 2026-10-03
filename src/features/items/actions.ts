import { useGame } from "../../store/game";
import { uid } from "../../lib/id";
import { sfx } from "../../lib/sfx";
import i18n from "../../i18n";
import { ITEM_LIMITS, RARITIES, clampText, itemKindOf, type ItemDef, type ItemKind, type ItemPatch, type Rarity } from "./model";

/** Lo que rellena el formulario de objeto. */
export interface ItemDraft {
  name: string;
  rarity: Rarity;
  kind: ItemKind;
  description: string;
  image?: string;
  droppable: boolean;
}

export const emptyItemDraft = (): ItemDraft => ({ name: "", rarity: "common", kind: "other", description: "", droppable: true });

/** Valida y normaliza un borrador. Sin nombre no hay objeto. */
function clean(d: ItemDraft): Omit<ItemDef, "id" | "createdAt"> | undefined {
  const name = clampText(d.name, ITEM_LIMITS.name);
  if (!name || !RARITIES.includes(d.rarity)) return undefined;
  return {
    name,
    rarity: d.rarity,
    kind: itemKindOf(d.kind),
    description: clampText(d.description, ITEM_LIMITS.description),
    image: d.image || undefined,
    droppable: d.droppable,
  };
}

export const isValidItemDraft = (d: ItemDraft) => clean(d) !== undefined;

/** Crea un objeto en el almanaque. Devuelve su id. */
export async function createItem(d: ItemDraft): Promise<string | undefined> {
  const fields = clean(d);
  if (!fields) return undefined;
  const item: ItemDef = { ...fields, id: uid(), createdAt: Date.now() };
  await useGame.getState().dispatch({ type: "item_created", item });
  sfx.tick();
  useGame.getState().say(() => i18n.t("items.toast.created", { name: item.name }));
  return item.id;
}

/** Edita un objeto. Solo viajan en el evento los campos que cambian. */
export async function updateItem(id: string, d: ItemDraft) {
  const { state, dispatch, say } = useGame.getState();
  const cur = state.items.get(id);
  const fields = clean(d);
  if (!cur || !fields) return;
  const patch: ItemPatch = {};
  for (const k of Object.keys(fields) as (keyof typeof fields)[]) {
    if (fields[k] !== cur[k]) Object.assign(patch, { [k]: fields[k] ?? "" });
  }
  if (Object.keys(patch).length === 0) return;
  await dispatch({ type: "item_updated", itemId: id, patch });
  sfx.tick();
  say(() => i18n.t("items.toast.updated", { name: fields.name }));
}

/** Retira un objeto del almanaque (y del inventario). Las quests que lo daban dejan de darlo. */
export async function deleteItem(id: string) {
  const { state, dispatch, say } = useGame.getState();
  const cur = state.items.get(id);
  if (!cur) return;
  sfx.cancel();
  await dispatch({ type: "item_deleted", itemId: id });
  say(() => i18n.t("items.toast.deleted", { name: cur.name }));
}

export const draftOf = (i: ItemDef): ItemDraft => ({
  name: i.name,
  rarity: i.rarity,
  kind: i.kind,
  description: i.description,
  image: i.image,
  droppable: i.droppable,
});

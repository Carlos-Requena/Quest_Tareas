import { useGame } from "../../store/game";
import { uid } from "../../lib/id";
import { sfx } from "../../lib/sfx";
import { gearName } from "../armory/labels";
import { isBuiltinGear } from "../armory/model";
import i18n, { num } from "../../i18n";
import { openBlobStore } from "../../storage/blobStore";
import { RARITIES, type Rarity } from "../items/model";
import { liveBlobIds } from "../temporal/model";
import { characterBlobIds } from "../menu/model";
import {
  buyBlocker,
  clampText,
  GEAR_LIMITS,
  gearBlobIds,
  isGearSlot,
  needsArt,
  priceOf,
  showcase,
  type BuyBlocker,
  type GearArt,
  type GearDef,
  type GearPatch,
  type GearSlot,
} from "./model";

/** Lo que rellena el formulario de mercancía. El precio no: lo pone Hu Tao según la rareza. */
export interface GearDraft {
  name: string;
  slot: GearSlot;
  rarity: Rarity;
  description: string;
  /** Icono (data URL). */
  image?: string;
  /** Imagen grande ya guardada (al editar). */
  art?: GearArt;
  /** Imagen grande recién elegida, aún sin guardar. */
  artBlob?: Blob;
}

export const emptyGearDraft = (slot: GearSlot = "head"): GearDraft => ({ name: "", slot, rarity: "common", description: "" });

export const draftOfGear = (g: GearDef): GearDraft => ({
  name: g.name,
  slot: g.slot,
  rarity: g.rarity,
  description: g.description,
  image: g.image || undefined,
  art: g.art,
});

/** Valida y normaliza un borrador. Sin nombre no hay pieza. */
function clean(d: GearDraft) {
  const name = clampText(d.name, GEAR_LIMITS.name);
  if (!name || !isGearSlot(d.slot) || !RARITIES.includes(d.rarity)) return undefined;
  return { name, slot: d.slot, rarity: d.rarity, description: clampText(d.description, GEAR_LIMITS.description), image: d.image || undefined };
}

export const isValidGearDraft = (d: GearDraft) => clean(d) !== undefined;

/** La imagen grande solo se guarda para el fondo. Si falla, la pieza se crea igual (con el icono). */
async function storeArt(d: GearDraft): Promise<GearArt | undefined> {
  if (!needsArt(d.slot) || !d.image) return undefined;
  if (!d.artBlob) return d.art;
  try {
    const blobId = await (await openBlobStore()).put(d.artBlob);
    return { blobId, mime: d.artBlob.type, size: d.artBlob.size };
  } catch (err) {
    console.error(err);
    return undefined;
  }
}

/** Borra del almacén las imágenes que ya no usa ninguna pieza ni ningún encargo. */
async function collect(candidates: (string | undefined)[]) {
  const ids = candidates.filter((id): id is string => !!id);
  if (!ids.length) return;
  const { state } = useGame.getState();
  const live = liveBlobIds(state.temporals.values());
  for (const id of gearBlobIds(state.gear.values())) live.add(id);
  for (const id of characterBlobIds(state.characters.values())) live.add(id);
  const blobs = await openBlobStore();
  for (const id of new Set(ids)) if (!live.has(id)) await blobs.remove(id);
}

/** Añade una pieza al catálogo de Hu Tao. Devuelve su id. */
export async function createGear(d: GearDraft): Promise<string | undefined> {
  const fields = clean(d);
  if (!fields) return undefined;
  const art = await storeArt(d);
  const gear: GearDef = { ...fields, ...(art ? { art } : {}), id: uid(), createdAt: Date.now() };
  await useGame.getState().dispatch({ type: "gear_created", gear });
  sfx.tick();
  useGame.getState().say(() => i18n.t("merchant.toast.created", { name: gear.name }));
  return gear.id;
}

/** Edita una pieza. Solo viajan en el evento los campos que cambian. */
export async function updateGear(id: string, d: GearDraft) {
  const { state, dispatch, say } = useGame.getState();
  const cur = state.gear.get(id);
  const fields = clean(d);
  // Las piezas de serie no se editan (la proyección ignoraría el evento).
  if (!cur || !fields || isBuiltinGear(id)) return;
  const patch: GearPatch = {};
  for (const k of ["name", "slot", "rarity", "description"] as const) if (fields[k] !== cur[k]) Object.assign(patch, { [k]: fields[k] });
  if ((fields.image ?? "") !== (cur.image ?? "")) patch.image = fields.image ?? "";
  const art = await storeArt(d);
  if (art?.blobId !== cur.art?.blobId) patch.art = art ?? null;
  if (Object.keys(patch).length === 0) return;
  await dispatch({ type: "gear_updated", gearId: id, patch });
  if (patch.art !== undefined) await collect([cur.art?.blobId]);
  sfx.tick();
  say(() => i18n.t("merchant.toast.updated", { name: fields.name }));
}

/** Retira una pieza del catálogo. Si era tuya, deja de serlo (el oro no se devuelve). */
export async function deleteGear(id: string) {
  const { state, dispatch, say } = useGame.getState();
  const cur = state.gear.get(id);
  if (!cur || isBuiltinGear(id)) return;
  sfx.cancel();
  await dispatch({ type: "gear_deleted", gearId: id });
  await collect([cur.art?.blobId]);
  say(() => i18n.t("merchant.toast.deleted", { name: cur.name }));
}

/** Lo que vende Hu Tao ahora mismo. */
export function currentShowcase(now = Date.now()) {
  const { state } = useGame.getState();
  return showcase(state.gear.values(), state.player.owned, now);
}

/** Por qué no se puede comprar ahora (o nada, si se puede). */
export function whyNotBuy(id: string, now = Date.now()): BuyBlocker | undefined {
  const { state } = useGame.getState();
  return buyBlocker(state.gear.get(id), state.player, currentShowcase(now).ids.has(id));
}

export type BuyResult = "ok" | BuyBlocker;

/**
 * Compra una pieza: comprueba el escaparate, el rango y el oro, y emite la compra con
 * el precio de ahora copiado en el evento.
 */
export async function buyGear(id: string): Promise<BuyResult> {
  const why = whyNotBuy(id);
  const { state, dispatch, say } = useGame.getState();
  const g = state.gear.get(id);
  if (why || !g) {
    sfx.cancel();
    return why ?? "missing";
  }
  const price = priceOf(g);
  await dispatch({ type: "gear_purchased", gearId: id, price });
  // La proyección vuelve a mirar el oro: si no llegaba (otro dispositivo), no hay compra.
  if (!useGame.getState().state.player.owned[id]) {
    sfx.cancel();
    return "gold";
  }
  say(() => i18n.t("merchant.toast.bought", { name: gearName(g, i18n.t), price: num(price) }));
  return "ok";
}

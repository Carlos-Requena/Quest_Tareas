import { useGame } from "../../store/game";
import { sfx } from "../../lib/sfx";
import i18n, { num } from "../../i18n";
import { collectibleOffer, collectiblePrice, offerBlocker, type OfferBlocker } from "./model";

/** El coleccionable que vende Hu Tao esta semana, con el estado del store. */
export function currentOffer(now = Date.now()) {
  const { state } = useGame.getState();
  return collectibleOffer(state.items.values(), state.player.inventory, state.player.collectiblesBought, now);
}

/** Por qué no se puede comprar ahora el objeto `id` (undefined si se puede). */
export function whyNotBuyCollectible(id: string): OfferBlocker | undefined {
  const { state } = useGame.getState();
  return offerBlocker(state.items.get(id), currentOffer(), state.player);
}

/** Compra el coleccionable de la semana. El precio se copia en el evento. */
export async function buyCollectible(id: string): Promise<OfferBlocker | "ok"> {
  const why = whyNotBuyCollectible(id);
  const { state, dispatch, say } = useGame.getState();
  const item = state.items.get(id);
  if (why || !item) {
    sfx.cancel();
    return why ?? "missing";
  }
  const price = collectiblePrice(item.rarity);
  await dispatch({ type: "collectible_purchased", itemId: id, price });
  // La proyección vuelve a mirar el oro: si no llegaba (otro dispositivo), no hay compra.
  if (!(useGame.getState().state.player.inventory[id] > 0)) {
    sfx.cancel();
    return "gold";
  }
  say(() => i18n.t("collectibles.toast.bought", { name: item.name, price: num(price) }));
  return "ok";
}

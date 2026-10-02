import { useGame } from "../../store/game";
import { sfx } from "../../lib/sfx";
import i18n from "../../i18n";
import { isDecorSlot, type GearSlot } from "../merchant/model";

/** Se pone una pieza comprada en su ranura (quitando la que hubiera). */
export async function equipGear(id: string) {
  const { state, dispatch, say } = useGame.getState();
  const g = state.gear.get(id);
  if (!g || !state.player.owned[id] || state.player.equipped[g.slot] === id) return;
  await dispatch({ type: "gear_equipped", gearId: id });
  sfx.tick();
  say(() => i18n.t(isDecorSlot(g.slot) ? "equipment.toast.decorated" : "equipment.toast.equipped", { name: g.name }));
}

/** Deja vacía una ranura. */
export async function unequipSlot(slot: GearSlot) {
  const { state, dispatch } = useGame.getState();
  if (!state.player.equipped[slot]) return;
  sfx.cancel();
  await dispatch({ type: "gear_unequipped", slot });
}

// Casos de uso de los personajes vivos: cambiar cómo se mueve un personaje o volver a los
// valores por defecto. Son eventos: el estilo llega a todos los equipos.

import { useGame } from "../../store/game";
import { sfx } from "../../lib/sfx";
import { cleanPatch, styleOf, type StylePatch } from "./model";

/** Cambia parte del estilo de un personaje (de serie o añadido). Lo que no cambia, no viaja. */
export async function setCharacterStyle(characterId: string, patch: StylePatch) {
  const { state, dispatch } = useGame.getState();
  const cur = styleOf(state.characterStyles, characterId);
  const clean = cleanPatch(patch);
  const changed = Object.fromEntries(Object.entries(clean).filter(([k, v]) => cur[k as keyof StylePatch] !== v)) as StylePatch;
  if (!Object.keys(changed).length) return;
  sfx.tick();
  await dispatch({ type: "character_style_set", characterId, style: changed });
}

/** Vuelve a los valores por defecto (lo que no se había tocado ya los seguía). */
export async function resetCharacterStyle(characterId: string) {
  const { state, dispatch } = useGame.getState();
  if (!state.characterStyles.has(characterId)) return;
  sfx.cancel();
  await dispatch({ type: "character_style_reset", characterId });
}

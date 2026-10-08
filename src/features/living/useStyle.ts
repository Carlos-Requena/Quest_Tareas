import { useGame } from "../../store/game";
import { styleOf, type CharacterStyle } from "./model";

/** El estilo de un personaje (los valores por defecto con lo que haya cambiado el jugador). */
export function useCharacterStyle(id: string | undefined): CharacterStyle {
  const styles = useGame((s) => s.state.characterStyles);
  return styleOf(styles, id);
}

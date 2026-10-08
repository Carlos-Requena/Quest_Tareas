// Casos de uso del compañero de «Mi día»: elegirlo y escribir lo que dice en cada situación.
// Son eventos: llegan a todos los equipos.

import { useGame } from "../../store/game";
import { sfx } from "../../lib/sfx";
import { uid } from "../../lib/id";
import { cleanVoice } from "../menu/model";
import type { Situation } from "./model";

/** Elige el compañero (sin id: vuelve a ser el personaje de hoy del menú). */
export async function chooseCompanion(characterId?: string) {
  const { state, dispatch } = useGame.getState();
  if (state.companion.chosen === characterId) return;
  sfx.move();
  await dispatch({ type: "companion_chosen", ...(characterId ? { characterId } : {}) });
}

/** Añade una frase del compañero para una situación. `false` si está vacía. */
export async function addCompanionLine(characterId: string, situation: Situation, text: string): Promise<boolean> {
  const clean = cleanVoice(text);
  if (!clean) return false;
  await useGame.getState().dispatch({ type: "companion_line_added", line: { id: uid(), characterId, situation, text: clean, createdAt: Date.now() } });
  sfx.tick();
  return true;
}

/** Cambia el texto de una frase. `false` si queda vacía. */
export async function updateCompanionLine(lineId: string, text: string): Promise<boolean> {
  const cur = useGame.getState().state.companion.lines.get(lineId);
  const clean = cleanVoice(text);
  if (!cur || !clean) return false;
  if (clean !== cur.text) await useGame.getState().dispatch({ type: "companion_line_updated", lineId, text: clean });
  sfx.tick();
  return true;
}

export async function removeCompanionLine(lineId: string) {
  if (!useGame.getState().state.companion.lines.has(lineId)) return;
  sfx.cancel();
  await useGame.getState().dispatch({ type: "companion_line_removed", lineId });
}

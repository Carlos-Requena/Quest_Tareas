// Casos de uso propios del teléfono. No emiten eventos nuevos: ordenan los de siempre para
// que las animaciones se vean con el detalle a pantalla completa.

import { useGame } from "../../store/game";
import { primaryAction } from "../../store/actions";
import { conditionsMet } from "../../domain/projection";
import type { QuestState, QuestStatus } from "../../domain/types";
import { isPhone } from "./phone";
import { useMobileUi } from "./ui";

/**
 * Qué hace deslizar una tarjeta del tablón hacia la derecha: lo mismo que su botón principal,
 * solo cuando se puede hacer ya (aceptar una disponible y sin requisitos pendientes; reportar una
 * en curso con los objetivos cumplidos). Si no, la tarjeta no se desliza.
 */
export function swipeAction(q: QuestState, status: QuestStatus, locked: boolean, now: number): "accept" | "report" | undefined {
  if (status === "available" && !locked) return "accept";
  if (status === "active" && conditionsMet(q, now)) return "report";
  return undefined;
}

/** Lo que tarda la hoja del detalle en salir (transition de .m-sheet en mobile.css). */
export const SHEET_MS = 320;

/**
 * Botón principal del detalle. En el teléfono, aceptar cierra antes el detalle y espera a que
 * salga: el sello «EN CURSO» se pone sobre la tarjeta del tablón y, si no, quedaría tapado.
 * Reportar no lo necesita, porque «Quest Clear» ya ocupa toda la pantalla.
 */
export async function detailPrimaryAction(questId: string) {
  const q = useGame.getState().state.quests.get(questId);
  const ui = useMobileUi.getState();
  if (isPhone() && q && q.status !== "active" && ui.detail === questId) {
    ui.closeDetail();
    await new Promise((r) => setTimeout(r, SHEET_MS));
  }
  await primaryAction(questId);
}

// Casos de uso de los fallos: emitir los que tocan, enseñar los nuevos y volver a clavar una copia.

import { useGame } from "../../store/game";
import type { QuestState } from "../../domain/types";
import { sfx } from "../../lib/sfx";
import { useEditingUi } from "../editing/ui";
import { useTemporalUi } from "../temporal/ui";
import { dueFailures, failedSince } from "./model";
import { useFailureUi } from "./ui";

let checking = false;

/**
 * Emite `quest_failed` y `temporal_failed` para lo que ha llegado al final de su día. Lo
 * llama el vigilante al arrancar y cada minuto. Si otro equipo lo emite a la vez, la
 * proyección deja contar solo el primero.
 */
export async function checkFailures(now = Date.now()) {
  const g = useGame.getState();
  if (!g.ready || !g.store || checking) return;
  checking = true;
  try {
    const due = dueFailures({ quests: g.state.quests.values(), temporals: g.state.temporals.values() }, now);
    for (const t of due.temporals) await useGame.getState().dispatch({ type: "temporal_failed", temporalId: t.id });
    for (const q of due.quests) await useGame.getState().dispatch({ type: "quest_failed", questId: q.id });
  } finally {
    checking = false;
  }
}

/**
 * Pone en la cola de animaciones lo que falló desde la última vez que se miró en este
 * equipo (también lo que llega de otro equipo). La primera vez solo apunta la hora.
 */
export function noticeFailures(now = Date.now()) {
  const g = useGame.getState();
  const ui = useFailureUi.getState();
  if (ui.seen === undefined) return ui.enqueue([], now);
  const fresh = failedSince({ quests: g.state.quests.values(), temporals: g.state.temporals.values() }, ui.seen);
  const items = [...fresh.temporals.map((t) => ({ kind: "temporal" as const, id: t.id, at: t.failedAt! })), ...fresh.quests.map((q) => ({ kind: "quest" as const, id: q.id, at: q.failedAt! }))].sort(
    (a, b) => a.at - b.at,
  );
  if (!items.length) return;
  ui.enqueue(
    items.map(({ kind, id }) => ({ kind, id })),
    Math.max(ui.seen, ...items.map((x) => x.at)),
  );
}

/** Copia de una quest fallida: el formulario completo con lo mismo, sin fecha límite (hay que elegir otra). */
export function repostQuest(id: string) {
  const q = useGame.getState().state.quests.get(id);
  if (!q) return;
  sfx.unfold();
  const { title, category, description, client, area, kind, conditions, reward, cooldownMinutes, repeatDays, requires, contacts }: QuestState = q;
  useEditingUi.getState().setDraft({ title, category, description, client, area, kind, conditions, reward, cooldownMinutes, repeatDays, requires, contacts });
}

/** Copia de un encargo quemado: su formulario con lo mismo, con fecha nueva y sus quests perdidas. */
export function repostTemporal(id: string) {
  if (!useGame.getState().state.temporals.has(id)) return;
  sfx.unfold();
  const ui = useTemporalUi.getState();
  ui.closeView();
  ui.setForm({ mode: "create", from: id });
}

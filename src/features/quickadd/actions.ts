// Casos de uso del alta rápida: publicar la quest de una línea o abrir el formulario completo con ella.

import { useGame } from "../../store/game";
import type { QuestDef } from "../../domain/types";
import { uid } from "../../lib/id";
import { sfx } from "../../lib/sfx";
import i18n from "../../i18n";
import { questReward } from "../rewards/model";
import { useHorizonUi } from "../horizon/ui";
import { useEditingUi } from "../editing/ui";
import { offerUndo } from "../undo/actions";
import { parseQuick } from "./model";
import { useQuickUi } from "./ui";

/** La quest de una línea: un objetivo de contador («Hacerlo ×N»), encargo por defecto. */
export function quickQuest(text: string, now = Date.now()): QuestDef | undefined {
  const p = parseQuick(text, now);
  if (!p.title) return undefined;
  const conditions: QuestDef["conditions"] = [{ id: uid(), kind: "count", label: i18n.t("quickadd.condition"), target: p.target }];
  return {
    id: uid(),
    title: p.title,
    category: p.category,
    client: p.client ?? "",
    area: p.area ?? "",
    kind: "",
    description: "",
    conditions,
    reward: questReward({ category: p.category, conditions }),
    dueAt: p.dueAt,
    createdAt: now,
  };
}

/** Publica la quest de la línea en el Quest Board (se puede deshacer). Devuelve si se publicó. */
export async function quickCreate(text: string): Promise<boolean> {
  const quest = quickQuest(text);
  const g = useGame.getState();
  if (!quest) {
    sfx.cancel();
    g.say(() => i18n.t("quickadd.empty"));
    return false;
  }
  const e = await g.dispatch({ type: "quest_created", quest });
  sfx.tick();
  // Que se vea aunque hubiera una pestaña o un plazo elegidos.
  if (g.section === "board") {
    g.setTab("all");
    useHorizonUi.getState().setFilter("board", "all");
    g.select(quest.id);
  }
  offerUndo(e, () => i18n.t("toast.published", { title: quest.title }));
  return true;
}

/** «Más detalles»: el formulario completo con lo que ya se ha escrito. */
export function quickDetails(text: string) {
  const q = quickQuest(text);
  sfx.unfold();
  useQuickUi.getState().setSheet(false);
  if (!q) {
    useGame.getState().setCreating(true);
    return;
  }
  const { id: _id, createdAt: _c, ...initial } = q;
  useEditingUi.getState().setDraft(initial);
}

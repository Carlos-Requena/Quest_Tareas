// Casos de uso de la búsqueda: abrirla y llevar a lo que se ha encontrado. Sin eventos.

import { useGame } from "../../store/game";
import { sfx } from "../../lib/sfx";
import i18n from "../../i18n";
import { goToQuest, goToTemporal } from "../temporal/actions";
import { repostQuest } from "../failure/actions";
import { dateKey, occursOn, addDays } from "../agenda/model";
import { useAgendaUi } from "../agenda/ui";
import { useCalendarUi } from "../calendar/ui";
import type { SearchHit } from "./model";
import { useSearchUi } from "./ui";

/** Abre la búsqueda (tecla / o ⌘K). */
export function openSearch() {
  sfx.unfold();
  useSearchUi.getState().setOpen(true);
}

export function closeSearch() {
  useSearchUi.getState().setOpen(false);
}

/**
 * Lleva a lo encontrado: la quest al Quest Board (si ya terminó, una copia para volver a
 * clavarla), el encargo a su cartel, el bloque al calendario y el objeto al almanaque.
 */
export function openHit(hit: SearchHit) {
  closeSearch();
  const g = useGame.getState();
  if (hit.kind === "quest") {
    if (hit.status === "done" || hit.status === "failed") return repostQuest(hit.id);
    return goToQuest(hit.id);
  }
  if (hit.kind === "temporal") return goToTemporal(hit.id);
  if (hit.kind === "agenda") {
    const e = g.state.agenda.get(hit.id);
    if (!e) return;
    // El próximo día que tiene el bloque (o su día, si ya pasó).
    let day = dateKey(Date.now());
    for (let i = 0; i < 366 && !occursOn(e, day); i++) day = addDays(day, 1);
    if (!occursOn(e, day)) day = e.date;
    sfx.page();
    g.setSection("calendar");
    useCalendarUi.getState().setDay(day);
    useCalendarUi.getState().setView("day");
    useAgendaUi.getState().setForm({ mode: "edit", id: e.id, date: day });
    return;
  }
  sfx.page();
  g.setCollection("almanac");
  g.say(() => i18n.t("search.itemHint", { name: hit.title }));
}

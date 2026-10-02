import { useTranslation } from "react-i18next";
import type { QuestState } from "../../../domain/types";
import { useGame } from "../../../store/game";
import { useNow } from "../../../lib/time";
import { KIND_META, pendingLinks } from "../model";
import { dueChip, longDue } from "../format";
import { goToTemporal } from "../actions";
import { Skull } from "./Skull";
import "../temporal.css";

/**
 * En el detalle de una quest: el encargo temporal al que pertenece, como un pequeño
 * cartel de pergamino con su fecha y cuántas quests le faltan. Lleva a su tablón.
 */
export function QuestEventLink({ quest }: { quest: QuestState }) {
  const ev = useGame((s) => (quest.temporalId ? s.state.temporals.get(quest.temporalId) : undefined));
  const quests = useGame((s) => s.state.quests);
  const now = useNow(30_000);
  const { t } = useTranslation();
  if (!ev) return null;
  const chip = dueChip(ev, now);
  const missing = pendingLinks(ev, quests).length;

  return (
    <button className={`qe ${KIND_META[ev.kind].red ? "is-red" : ""}`} title={t("temporal.quests.detailOpen")} onClick={() => goToTemporal(ev.id)}>
      <span className="qe-skulls">
        {Array.from({ length: ev.difficulty }, (_, i) => (
          <Skull key={i} />
        ))}
      </span>
      <span className="qe-body">
        <span className="qe-kind">{KIND_META[ev.kind].tag}</span>
        <span className="qe-title">{ev.title}</span>
        <span className="qe-when">{longDue(ev)}</span>
      </span>
      <span className="qe-side">
        <span className={`tp-chip is-${chip.urgency} qe-chip`}>{chip.label}</span>
        <span className="qe-left">{missing ? t("temporal.quests.missing", { count: missing }) : t("temporal.quests.ready")}</span>
      </span>
    </button>
  );
}

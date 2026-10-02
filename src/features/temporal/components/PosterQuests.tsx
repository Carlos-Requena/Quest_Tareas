import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { useNow } from "../../../lib/time";
import { LockIcon } from "../../complex";
import { linkedQuests, type TemporalState } from "../model";
import { linkState, type LinkState } from "../links";
import { goToQuest } from "../actions";
import { SwordIcon } from "./Poster";

const MARK: Record<LinkState, React.ReactNode> = {
  done: "✓",
  active: "◆",
  locked: <LockIcon />,
  available: "○",
  cooldown: "◷",
};

/** Las quests del encargo en el cartel abierto: cuáles están terminadas y cuáles faltan. Cada una lleva al Quest Board. */
export function PosterQuests({ t }: { t: TemporalState }) {
  const quests = useGame((s) => s.state.quests);
  const now = useNow(30_000);
  const { t: tr } = useTranslation();
  const list = linkedQuests(t, quests);
  if (!list.length) return null;
  // Un encargo cumplido tenía todas sus quests terminadas.
  const states = list.map((q) => (t.status === "done" ? "done" : linkState(q, t.linkedAt[q.id] ?? 0, quests, now)));
  const done = states.filter((s) => s === "done").length;

  return (
    <div className="pv-quests pv-in">
      <span className="pv-lbl">
        <SwordIcon /> {tr("temporal.quests.view")} · {tr("temporal.quests.progress", { done, total: list.length })}
      </span>
      <div className="pv-quest-list">
        {list.map((q, i) => (
          <button key={q.id} className={`pv-quest is-${states[i]}`} title={tr("temporal.quests.goTo")} onClick={() => goToQuest(q.id)}>
            <span className="pv-quest-mark">{MARK[states[i]]}</span>
            <span className="pv-quest-title">{q.title}</span>
            <span className="pv-quest-state">{tr(`temporal.quests.status.${states[i]}`)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

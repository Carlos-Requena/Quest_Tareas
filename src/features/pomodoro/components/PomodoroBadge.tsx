import type { QuestState } from "../../../domain/types";
import { isPomodoroCondition } from "../../../domain/types";
import { useNow } from "../../../lib/time";
import { formatClock, planOf, viewPomodoro } from "../model";
import "../pomodoro.css";

/** Tiempo restante y ronda en la tarjeta del tablón mientras hay un pomodoro en curso. */
export function PomodoroBadge({ quest }: { quest: QuestState }) {
  const now = useNow(1000);
  if (quest.status !== "active") return null;
  for (const c of quest.conditions) {
    const p = quest.pomodoros[c.id];
    if (!isPomodoroCondition(c) || !p) continue;
    const v = viewPomodoro(p, planOf(c), now);
    if (v.phase !== "focus" && v.phase !== "paused" && v.phase !== "break") continue;
    return (
      <span className={`pomo-badge phase-${v.phase}`}>
        <span className="pomo-badge-dot" />
        <span className="num">{formatClock(v.remainingMs)}</span>
        {v.rounds > 1 && <span className="pomo-badge-round num">{v.round}/{v.rounds}</span>}
      </span>
    );
  }
  return null;
}

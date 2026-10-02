import { useTranslation } from "react-i18next";
import type { QuestState } from "../../../domain/types";
import { flameTier, liveStreak, streakAtRisk, STREAK_SHOWN_FROM } from "../model";
import { Flame } from "./Flame";
import "../streaks.css";

/** Racha en la tarjeta: la llama y las veces seguidas. Parpadea si está a punto de romperse. */
export function StreakBadge({ quest, now }: { quest: QuestState; now: number }) {
  const { t } = useTranslation();
  const n = liveStreak(quest.streak, now);
  if (n < STREAK_SHOWN_FROM) return null;
  const risk = streakAtRisk(quest.streak, quest.cooldownMinutes, now);
  return (
    <span className={`streak-badge ${risk ? "is-risk" : ""}`} title={t("streaks.badge", { n })}>
      <Flame tier={flameTier(n)} />
      <b className="num">{n}</b>
    </span>
  );
}

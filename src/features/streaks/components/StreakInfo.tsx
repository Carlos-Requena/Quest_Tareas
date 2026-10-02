import { useTranslation } from "react-i18next";
import type { QuestState } from "../../../domain/types";
import { LANGS, currentLang } from "../../../i18n";
import { formatRemaining } from "../../../lib/time";
import { flameTier, liveStreak, streakAtRisk } from "../model";
import { Flame } from "./Flame";
import "../streaks.css";

const when = (ts: number) =>
  new Date(ts).toLocaleString(LANGS[currentLang()].locale, { weekday: "long", hour: "2-digit", minute: "2-digit" });

/** Racha en el detalle de una quest que se repite: cuántas veces seguidas, la mejor y hasta cuándo dura. */
export function StreakInfo({ quest, now }: { quest: QuestState; now: number }) {
  const { t } = useTranslation();
  const s = quest.streak;
  const n = liveStreak(s, now);
  const risk = streakAtRisk(s, quest.cooldownMinutes, now);

  if (!s) return <p className="streak-info muted">{t("streaks.none")}</p>;
  return (
    <div className={`streak-info ${n ? "" : "is-broken"} ${risk ? "is-risk" : ""}`}>
      <span className="streak-big">
        <Flame tier={n ? flameTier(n) : 0} size={22} />
        <b className="num">{n}</b>
      </span>
      <span className="streak-txt">
        {n ? (
          <>
            <span>{t("streaks.current", { count: n })}</span>
            <span className={risk ? "streak-warn" : "muted"}>
              {risk ? t("streaks.risk", { left: formatRemaining(s.until - now) }) : t("streaks.until", { when: when(s.until) })}
            </span>
          </>
        ) : (
          <span className="muted">{t("streaks.broken", { n: s.best })}</span>
        )}
      </span>
      {n > 0 && <span className="streak-best muted">{t("streaks.best", { n: s.best })}</span>}
    </div>
  );
}

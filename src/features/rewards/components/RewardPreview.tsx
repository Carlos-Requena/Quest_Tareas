import { useTranslation } from "react-i18next";
import { GoldIcon } from "../../../components/Header";
import { num } from "../../../i18n";
import type { Reward } from "../model";
import "../rewards.css";

/** Recompensa calculada en un formulario: se ve, pero no se edita (features/rewards). */
export function RewardPreview({ reward, hint, children }: { reward: Reward; hint: string; children?: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="field rw-field">
      <span className="lbl">{t("rewards.label")}</span>
      <div className="rewards rw-preview" aria-live="polite">
        <span className="reward">
          <span className="reward-ico xp">XP</span>
          <b className="num">{num(reward.xp)}</b>
        </span>
        <span className="reward">
          <GoldIcon />
          <b className="num">{num(reward.gold)}</b>
          <small className="muted">G</small>
        </span>
        {children}
      </div>
      <p className="rw-hint muted">{hint}</p>
    </div>
  );
}

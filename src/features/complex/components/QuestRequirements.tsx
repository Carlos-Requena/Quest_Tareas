import { useTranslation } from "react-i18next";
import type { QuestState } from "../../../domain/types";
import { CATEGORY_META } from "../../../domain/types";
import { useGame } from "../../../store/game";
import { sfx } from "../../../lib/sfx";
import { dependents, requirementMet } from "../model";
import { useHorizonUi } from "../../horizon/ui";
import "../complex.css";

/** Selecciona otra quest del tablón (requisito o quest que desbloquea). */
function goTo(id: string) {
  const g = useGame.getState();
  sfx.move();
  // Pestaña y plazo a «todo»: si no, la quest podría quedar fuera del tablón filtrado.
  useHorizonUi.getState().setFilter("board", "all");
  g.setTab("all");
  g.select(id);
}

/**
 * Requisitos de la quest (✓ completados, 🔒 pendientes) y las quests que desbloquea.
 * Cada fila lleva a esa quest del tablón.
 */
export function QuestRequirements({ quest }: { quest: QuestState }) {
  const quests = useGame((s) => s.state.quests);
  const { t } = useTranslation();
  const reqs = (quest.requires ?? []).map((id) => quests.get(id)).filter((q): q is QuestState => !!q);
  const unlocks = dependents(quest.id, quests.values());

  return (
    <div className="rq-detail">
      {reqs.map((r) => {
        const met = requirementMet(r.id, quests);
        return (
          <button
            key={r.id}
            className={`rq-row ${met ? "is-met" : ""}`}
            style={{ "--cat": CATEGORY_META[r.category].color } as React.CSSProperties}
            title={t("complex.detail.open")}
            onClick={() => goTo(r.id)}
          >
            <span className="rq-mark">{met ? "✓" : <LockIcon />}</span>
            <span className="gem" />
            <span className="rq-title">{r.title}</span>
            <span className="rq-state">{met ? t("complex.detail.met") : t("complex.detail.pending")}</span>
          </button>
        );
      })}
      {unlocks.length > 0 && (
        <p className="rq-unlocks">
          <span className="lbl">{t("complex.detail.unlocks")}</span>
          {unlocks.map((d) => (
            <button key={d.id} className="rq-link" onClick={() => goTo(d.id)}>
              {d.title}
            </button>
          ))}
        </p>
      )}
    </div>
  );
}

/** Candado pequeño (tarjetas, detalle y formulario). */
export function LockIcon() {
  return (
    <svg viewBox="0 0 16 18" className="lock-ico" aria-hidden>
      <path d="M4.5 8V5.5a3.5 3.5 0 0 1 7 0V8" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="2.5" y="8" width="11" height="8.5" rx="1.2" fill="currentColor" />
      <circle cx="8" cy="12" r="1.3" style={{ fill: "var(--bg)" }} />
    </svg>
  );
}

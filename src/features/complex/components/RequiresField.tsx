import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { CATEGORY_META } from "../../../domain/types";
import { useGame } from "../../../store/game";
import { sfx } from "../../../lib/sfx";
import { MAX_REQUIRES, requirementCandidates } from "../model";
import "../complex.css";

/** Requisitos de una quest nueva: quests del tablón que hay que completar antes de aceptarla. */
export function RequiresField({ value, onChange }: { value: string[]; onChange(v: string[]): void }) {
  const quests = useGame((s) => s.state.quests);
  const { t } = useTranslation();
  const candidates = requirementCandidates(quests.values()).filter((q) => !value.includes(q.id));
  const chosen = value.map((id) => quests.get(id)).filter((q) => !!q);

  return (
    <div className="field">
      <span className="lbl">{t("complex.requires.label")}</span>
      <div className="rq-list">
        <AnimatePresence initial={false}>
          {chosen.map((q, i) => (
            <motion.span
              key={q.id}
              className="rq-chip"
              style={{ "--cat": CATEGORY_META[q.category].color } as React.CSSProperties}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
            >
              <span className="rq-i num">{i + 1}</span>
              <span className="gem" />
              <span className="rq-title">{q.title}</span>
              <button
                type="button"
                className="icon-btn"
                title={t("complex.requires.remove")}
                onClick={() => {
                  sfx.tick();
                  onChange(value.filter((x) => x !== q.id));
                }}
              >
                ✕
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        {value.length < MAX_REQUIRES &&
          (candidates.length ? (
            <select
              className="rq-pick"
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                sfx.tick();
                onChange([...value, e.target.value]);
              }}
            >
              <option value="">{t("complex.requires.pick")}</option>
              {candidates.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title}
                </option>
              ))}
            </select>
          ) : (
            !value.length && <span className="rc-hint muted">{t("complex.requires.none")}</span>
          ))}
      </div>
      {value.length > 0 && <p className="rc-hint muted">{t("complex.requires.hint")}</p>}
    </div>
  );
}

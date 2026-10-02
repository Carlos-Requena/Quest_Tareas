import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import type { QuestState } from "../../../domain/types";
import { checklistProgress, isChecked, type ChecklistConditionDef } from "../model";
import { toggleCheck } from "../actions";
import "../checklist.css";

/** Objetivo de tipo lista en el detalle de la quest: las casillas, que se marcan con la quest en curso. */
export function ChecklistCondition({ quest, cond }: { quest: QuestState; cond: ChecklistConditionDef }) {
  const { t } = useTranslation();
  const active = quest.status === "active";
  const done = active ? checklistProgress(quest.checked, cond) : 0;
  const all = cond.target > 0 && done >= cond.target;

  return (
    <div className={`cond cond-list ${all ? "done" : ""}`}>
      <span className="cond-kind">
        {all ? "✓" : "☰"} {t("checklist.kind")}
      </span>
      <span className="cond-label">{cond.label}</span>
      <span className="cond-bar">
        <motion.span
          className="cond-fill"
          animate={{ width: `${cond.target ? (done / cond.target) * 100 : 0}%` }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
        />
      </span>
      <span className="num cond-val">
        {done} <small>/ {cond.target}</small>
      </span>
      <ul className="clist">
        {cond.items.map((it) => {
          const on = active && isChecked(quest.checked, cond.id, it.id);
          return (
            <li key={it.id}>
              <button
                type="button"
                className={`clist-item ${on ? "is-on" : ""}`}
                disabled={!active}
                aria-pressed={on}
                title={active ? t(on ? "checklist.uncheck" : "checklist.check") : undefined}
                onClick={() => toggleCheck(quest.id, cond.id, it.id)}
              >
                <span className="clist-box" aria-hidden>
                  <svg viewBox="0 0 14 14">
                    <motion.path
                      d="M3 7.4 L6 10.2 L11.4 3.6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={false}
                      animate={{ pathLength: on ? 1 : 0, opacity: on ? 1 : 0 }}
                      transition={{ duration: 0.22 }}
                    />
                  </svg>
                </span>
                <span className="clist-text">{it.text}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

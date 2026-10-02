import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useGame, type Tab } from "../store/game";
import { sfx } from "../lib/sfx";

export const TABS: { id: Tab; color: string }[] = [
  { id: "all", color: "var(--gold)" },
  { id: "request", color: "var(--request)" },
  { id: "elite", color: "var(--elite)" },
  { id: "repeat", color: "var(--repeat)" },
];

export function Tabs() {
  const tab = useGame((s) => s.tab);
  const setTab = useGame((s) => s.setTab);
  const { t: tr } = useTranslation();

  return (
    <div className="tabs" role="tablist">
      {TABS.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={tab === t.id}
          className={`tab ${tab === t.id ? "on" : ""}`}
          onClick={() => {
            sfx.move();
            setTab(t.id);
          }}
        >
          {tab === t.id && (
            <motion.span layoutId="tab-hl" className="tab-hl" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
          )}
          <span className="gem" style={{ color: tab === t.id ? "#2a2110" : t.color }} />
          <span className="tab-lbl">{tr(`tabs.${t.id}`)}</span>
        </button>
      ))}
    </div>
  );
}

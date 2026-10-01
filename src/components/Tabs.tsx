import { motion } from "motion/react";
import { useGame, type Tab } from "../store/game";
import { sfx } from "../lib/sfx";

export const TABS: { id: Tab; label: string; color: string }[] = [
  { id: "all", label: "Todas", color: "var(--gold)" },
  { id: "request", label: "Encargos", color: "var(--request)" },
  { id: "elite", label: "Élite", color: "var(--elite)" },
  { id: "repeat", label: "Repetibles", color: "var(--repeat)" },
];

export function Tabs() {
  const tab = useGame((s) => s.tab);
  const setTab = useGame((s) => s.setTab);

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
          <span className="tab-lbl">{t.label}</span>
        </button>
      ))}
    </div>
  );
}

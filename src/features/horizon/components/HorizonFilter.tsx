import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import type { Section } from "../../../store/game";
import { sfx } from "../../../lib/sfx";
import type { HorizonFilter as Filter } from "../model";
import { filtersOf, useHorizonUi } from "../ui";
import "../horizon.css";

/**
 * Filtro de plazo de un tablón: Todo · 1 día · 7 días · 2 semanas · 1 mes · +1 mes
 * (· Sin fecha, en el de quests). Cada opción muestra cuántos hay. Tecla H.
 */
export function HorizonFilter({ section, counts }: { section: Section; counts: Record<Filter, number> }) {
  const value = useHorizonUi((s) => s.filter[section]);
  const { t } = useTranslation();

  return (
    <div className={`hz hz-on-${section}`} role="tablist" aria-label={t("horizon.switch")}>
      {filtersOf(section).map((f) => {
        const on = value === f;
        return (
          <button
            key={f}
            role="tab"
            aria-selected={on}
            className={`hz-btn hz-${f} ${on ? "on" : ""} ${f !== "all" && counts[f] === 0 ? "is-empty" : ""}`}
            title={`${t(`horizon.hint.${f}`)} (H)`}
            onClick={() => {
              if (!on) sfx.move();
              useHorizonUi.getState().setFilter(section, f);
            }}
          >
            {on && <motion.span layoutId={`hz-hl-${section}`} className="hz-hl" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            {f !== "all" && <span className="hz-dot" />}
            <span className="hz-lbl">{t(`horizon.filter.${f}`)}</span>
            <span className="hz-n num">{counts[f]}</span>
          </button>
        );
      })}
    </div>
  );
}

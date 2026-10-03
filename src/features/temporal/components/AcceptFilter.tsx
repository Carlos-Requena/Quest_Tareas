import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { sfx } from "../../../lib/sfx";
import { ACCEPT_FILTERS, type AcceptFilter as Filter } from "../model";
import { useTemporalUi } from "../ui";

/**
 * Filtro del tablón de encargos por aceptación: Todos · Aceptados · Sin aceptar, con
 * cuántos pendientes hay en cada uno. Se combina con el de plazos y se recuerda en cada equipo.
 */
export function AcceptFilter({ counts }: { counts: Record<Filter, number> }) {
  const value = useTemporalUi((s) => s.accept);
  const { t } = useTranslation();

  return (
    <div className="tb-accept" role="tablist" aria-label={t("temporal.board.filter.switch")}>
      {ACCEPT_FILTERS.map((f) => {
        const on = value === f;
        return (
          <button
            key={f}
            role="tab"
            aria-selected={on}
            className={`tb-accept-btn is-${f} ${on ? "on" : ""} ${f !== "all" && counts[f] === 0 ? "is-empty" : ""}`}
            onClick={() => {
              if (on) return;
              sfx.move();
              useTemporalUi.getState().setAccept(f);
            }}
          >
            {on && <motion.span layoutId="tb-accept-hl" className="tb-accept-hl" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            {f !== "all" && <span className="tb-accept-ico" aria-hidden />}
            <span className="tb-accept-lbl">{t(`temporal.board.filter.${f}`)}</span>
            <span className="tb-accept-n num">{counts[f]}</span>
          </button>
        );
      })}
    </div>
  );
}

import { useMemo } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useGame, type Section } from "../../../store/game";
import { useNow } from "../../../lib/time";
import { sfx } from "../../../lib/sfx";
import { needsAttention } from "../model";
import { Skull } from "./Skull";
import { CalendarIcon } from "../../calendar/components/CalendarIcon";
import "../temporal.css";

const SECTIONS: Section[] = ["board", "temporal", "calendar"];
/** Tecla de cada sección (el calendario, con S; los dos tablones se alternan con T). */
const KEY: Record<Section, string> = { board: "T", temporal: "T", calendar: "S" };

/** Cambia de tablón (botones de la cabecera o tecla T). */
export function switchSection(next?: Section) {
  const { section, setSection } = useGame.getState();
  const target = next ?? (section === "board" ? "temporal" : "board");
  if (target === section) return;
  sfx.page();
  setSection(target);
}

/**
 * Selector de sección en la cabecera: el tablón de quests, el de encargos temporales o el calendario.
 * El aviso rojo cuenta los encargos de hoy o vencidos, para verlos desde el otro tablón.
 */
export function SectionSwitch() {
  const section = useGame((s) => s.section);
  const temporals = useGame((s) => s.state.temporals);
  const now = useNow(60_000);
  const { t } = useTranslation();
  const urgent = useMemo(() => needsAttention(temporals.values(), now), [temporals, now]);

  return (
    <div className="secsw" role="tablist" aria-label={t("temporal.section.switch")}>
      {SECTIONS.map((id) => {
        const on = section === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={on}
            className={`secsw-btn ${on ? "on" : ""}`}
            title={`${t(`temporal.section.${id}`)} (${KEY[id]})`}
            onClick={() => switchSection(id)}
          >
            {on && <motion.span layoutId="secsw-hl" className="secsw-hl" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            <span className="secsw-ico">{id === "board" ? <span className="gem" /> : id === "temporal" ? <Skull /> : <CalendarIcon />}</span>
            <span className="secsw-lbl">{t(`temporal.section.${id}`)}</span>
            {id === "temporal" && urgent > 0 && (
              <span className="secsw-badge num" title={t("temporal.section.attention", { count: urgent })}>
                {urgent}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

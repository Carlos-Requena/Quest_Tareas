import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { sfx } from "../../../lib/sfx";
import { addCompanionLine, companionLinesOf, removeCompanionLine, SITUATIONS, updateCompanionLine, type Situation } from "../../companion";
import type { MenuCharacter } from "../../menu/characters";
import { useCustomizeUi } from "../ui";
import { SituationIcon } from "./CustomizeIcons";
import { LineList } from "./Lines";

/** Huecos que se pueden usar en una frase, tal cual (sin que i18next los rellene). */
const RAW = { title: "{{title}}", n: "{{n}}", time: "{{time}}" };

/**
 * Lo que dice un personaje cuando te acompaña en «Mi día»: una pestaña por situación (lo que
 * se pierde esta noche, una racha en peligro, lo que hay en curso…) y sus frases. Sin ninguna,
 * dice una de las tres de serie.
 */
export function CompanionPanel({ c }: { c: MenuCharacter }) {
  const { t } = useTranslation();
  const situation = useCustomizeUi((s) => s.situation);
  const all = useGame((s) => s.state.companion.lines);
  const mine = useMemo(() => companionLinesOf(all.values(), c.id), [all, c.id]);
  const shown = mine.filter((l) => l.situation === situation);

  const setSituation = (x: Situation) => {
    if (x === situation) return;
    sfx.move();
    useCustomizeUi.getState().set({ situation: x });
  };

  return (
    <section className="cz-voice-main">
      <nav className="cz-parts cz-sits" role="tablist">
        {SITUATIONS.map((x) => (
          <button key={x} role="tab" aria-selected={x === situation} className={`cz-part cz-sit ${x === situation ? "is-on" : ""}`} onClick={() => setSituation(x)}>
            <SituationIcon situation={x} />
            <span className="cz-part-txt">
              <b>{t(`companion.situations.${x}`)}</b>
              <small>{t(`companion.tags.${x}`)}</small>
            </span>
            <b className="num cz-part-n">{mine.filter((l) => l.situation === x).length}</b>
          </button>
        ))}
      </nav>

      <LineList
        items={shown}
        icon={<SituationIcon situation={situation} />}
        badge="Today"
        defaults={(["a", "b", "c"] as const).map((k) => t(`companion.say.${situation}.${k}`, RAW))}
        placeholder={t(`customize.today.placeholder.${situation}`)}
        hint={`${shown.length === 0 ? t("customize.today.defaultHint") : t("customize.today.many")} ${t("customize.today.vars", RAW)}`}
        onAdd={(text) => addCompanionLine(c.id, situation, text)}
        onUpdate={updateCompanionLine}
        onRemove={(id) => void removeCompanionLine(id)}
      />
    </section>
  );
}

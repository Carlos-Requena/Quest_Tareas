import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { sfx } from "../../../lib/sfx";
import { addVoiceLine, removeVoiceLine, updateVoiceLine } from "../../menu/actions";
import type { MenuCharacter } from "../../menu/characters";
import { DAYPARTS, linesOf, type Daypart } from "../../menu/model";
import { useCustomizeUi } from "../ui";
import { DaypartIcon } from "./CustomizeIcons";
import { LineList } from "./Lines";

/**
 * Lo que dice un personaje en el menú según la hora: una pestaña por parte del día y sus
 * frases en filas, como las misiones de un gacha. Sin límite de frases. Sin ninguna a esa
 * hora, se ve la de serie, que es la que dice.
 */
export function VoicePanel({ c }: { c: MenuCharacter }) {
  const { t } = useTranslation();
  const part = useCustomizeUi((s) => s.part);
  const all = useGame((s) => s.state.voiceLines);
  const mine = useMemo(() => linesOf(all.values(), c.id), [all, c.id]);
  const shown = mine.filter((l) => l.part === part);

  const setPart = (p: Daypart) => {
    if (p === part) return;
    sfx.move();
    useCustomizeUi.getState().set({ part: p });
  };

  return (
    <section className="cz-voice-main">
      <nav className="cz-parts" role="tablist">
        {DAYPARTS.map((p) => (
          <button key={p} role="tab" aria-selected={p === part} className={`cz-part ${p === part ? "is-on" : ""}`} onClick={() => setPart(p)}>
            <DaypartIcon part={p} />
            <span className="cz-part-txt">
              <b>{t(`customize.voice.parts.${p}`)}</b>
              <small>{t(`customize.voice.hours.${p}`)}</small>
            </span>
            <b className="num cz-part-n">{mine.filter((l) => l.part === p).length}</b>
          </button>
        ))}
      </nav>

      <LineList
        items={shown}
        icon={<DaypartIcon part={part} />}
        badge="Voice"
        defaults={[t(`menu.voice.${part}`)]}
        placeholder={t(`customize.voice.placeholder.${part}`)}
        hint={shown.length === 0 ? t("customize.voice.defaultHint") : shown.length > 1 ? t("customize.voice.many") : ""}
        onAdd={(text) => addVoiceLine(c.id, part, text)}
        onUpdate={updateVoiceLine}
        onRemove={(id) => void removeVoiceLine(id)}
      />
    </section>
  );
}

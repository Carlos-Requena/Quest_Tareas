import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { sfx } from "../../../lib/sfx";
import { calm } from "../../../lib/fx";
import { characterName, useCast } from "../../menu/components/MenuCast";
import { BackIcon } from "../../menu/components/MenuIcons";
import type { MenuCharacter } from "../../menu/characters";
import { LivingCharacter, useCharacterStyle } from "../../living";
import { chooseCompanion, companionOf } from "../../companion";
import { useCustomizeUi, type CharacterPane } from "../ui";
import { CompanionPanel } from "./CompanionPanel";
import { MotionPanel } from "./MotionPanel";
import { VoicePanel } from "./VoiceEditor";

const PANES: { id: CharacterPane; tag: string }[] = [
  { id: "voice", tag: "Voice" },
  { id: "today", tag: "Today" },
  { id: "motion", tag: "Motion" },
];

/**
 * Un personaje elegido en la pestaña Cast: a la izquierda, él vivo (con su estilo, como en el
 * menú); a la derecha, lo que dice en el menú, lo que dice en «Mi día» y cómo se mueve.
 */
export function CharacterEditor({ c }: { c: MenuCharacter }) {
  const { t } = useTranslation();
  const pane = useCustomizeUi((s) => s.pane);
  const replay = useCustomizeUi((s) => s.replay);
  const cast = useCast();
  const chosen = useGame((s) => s.state.companion.chosen);
  const style = useCharacterStyle(c.id);
  const name = characterName(c, t);
  const companion = companionOf(
    cast.list.map((x) => x.id),
    cast.current?.id,
    chosen,
  );
  const still = calm();

  const back = () => {
    sfx.move();
    useCustomizeUi.getState().set({ character: undefined });
  };
  const setPane = (p: CharacterPane) => {
    if (p === pane) return;
    sfx.move();
    useCustomizeUi.getState().set({ pane: p });
  };

  return (
    <div className="cz-voice">
      <header className="cz-voice-h">
        <button className="cz-back" onClick={back}>
          <BackIcon />
          {t("customize.voice.back")}
        </button>
        <h3 className="cz-voice-title">{name}</h3>
        <nav className="cz-panes" role="tablist" aria-label={name}>
          {PANES.map((p) => (
            <button key={p.id} role="tab" aria-selected={pane === p.id} className={`cz-pane ${pane === p.id ? "is-on" : ""}`} onClick={() => setPane(p.id)}>
              <small>{p.tag}</small>
              <b>{t(`customize.panes.${p.id}`)}</b>
            </button>
          ))}
        </nav>
      </header>

      <div className={`cz-voice-body is-${pane}`}>
        <aside className="cz-voice-who">
          <span className="cz-voice-art">
            {/* Con la entrada «deslizarse», «Ver la entrada» la repite aquí; la «gacha» la hace el propio personaje. */}
            <motion.span
              key={style.entrance === "slide" ? replay : "still"}
              className="cz-live"
              initial={replay && style.entrance === "slide" && !still ? { opacity: 0, x: -40 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <LivingCharacter c={c} style={style} entrance={replay > 0 ? replay : undefined} />
            </motion.span>
          </span>
          <span className="cz-voice-name">
            <b>{name}</b>
            {c.builtin && <span className="cz-card-tag">{t("customize.card.builtin")}</span>}
            {cast.current?.id === c.id && <span className="cz-card-tag is-today">{t("customize.voice.today")}</span>}
            {companion === c.id && <span className="cz-card-tag is-today">{t("customize.card.companion")}</span>}
          </span>
          {pane === "today" && (
            <span className="cz-comp">
              {chosen === c.id ? (
                <button className="btn btn-ghost cz-comp-b" onClick={() => void chooseCompanion(undefined)}>
                  {t("customize.today.follow")}
                </button>
              ) : (
                <button className="btn btn-primary cz-comp-b" onClick={() => void chooseCompanion(c.id)}>
                  {t("customize.today.choose")}
                </button>
              )}
              <small className="muted">{chosen === c.id ? t("customize.today.chosenHint") : t("customize.today.followHint")}</small>
            </span>
          )}
        </aside>

        {pane === "voice" && <VoicePanel c={c} />}
        {pane === "today" && <CompanionPanel c={c} />}
        {pane === "motion" && <MotionPanel c={c} />}
      </div>
    </div>
  );
}

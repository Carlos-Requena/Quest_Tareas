import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { calm } from "../../../lib/fx";
import { sfx } from "../../../lib/sfx";
import { CharacterImage, characterName, useCast } from "../../menu/components/MenuCast";
import { AURA_TOKEN, useCharacterStyle } from "../../living";
import type { TodayPlan } from "../../today/model";
import { companionContext } from "../day";
import { companionLinesOf, companionOf, fillLine, pickIndex } from "../model";
import "../companion.css";

/** Las tres frases de serie de cada situación (companion.say.<situación>.a/b/c). */
const DEFAULT_KEYS = ["a", "b", "c"] as const;
/** Milisegundos por carácter al escribir la frase, como el cuadro de diálogo de un JRPG. */
const TYPE_MS = 26;

/**
 * El compañero de «Mi día»: un cuadro de diálogo de JRPG con el retrato del personaje, que
 * comenta la situación del día. Al tocarlo, dice otra frase (o termina de escribir la actual).
 */
export function CompanionBox({ plan, now }: { plan: TodayPlan; now: number }) {
  const { t } = useTranslation();
  const cast = useCast();
  const companion = useGame((s) => s.state.companion);
  const id = companionOf(
    cast.list.map((c) => c.id),
    cast.current?.id,
    companion.chosen,
  );
  const who = cast.list.find((c) => c.id === id);
  const style = useCharacterStyle(id);
  const ctx = useMemo(() => companionContext(plan, now), [plan, now]);

  // Sus frases para esta situación; sin ninguna, las de serie.
  const own = useMemo(() => (id ? companionLinesOf(companion.lines.values(), id, ctx.situation) : []), [companion.lines, id, ctx.situation]);
  const texts = own.length ? own.map((l) => fillLine(l.text, ctx.vars)) : DEFAULT_KEYS.map((k) => t(`companion.say.${ctx.situation}.${k}`, ctx.vars));

  const [pick, setPick] = useState(() => pickIndex(texts.length, Math.random()));
  // Si cambia la situación o el compañero, otra frase al azar.
  useEffect(() => setPick(pickIndex(texts.length, Math.random())), [ctx.situation, id, texts.length]);
  const text = texts[Math.max(0, Math.min(pick, texts.length - 1))] ?? "";

  // Escribe la frase letra a letra (de golpe con «reducir movimiento»).
  const still = calm();
  const chars = useMemo(() => [...text], [text]);
  const [typed, setTyped] = useState(still ? chars.length : 0);
  useEffect(() => {
    if (still) {
      setTyped(chars.length);
      return;
    }
    setTyped(0);
    const timer = setInterval(() => setTyped((n) => (n >= chars.length ? (clearInterval(timer), n) : n + 1)), TYPE_MS);
    return () => clearInterval(timer);
  }, [chars, still]);
  const done = typed >= chars.length;

  if (!who) return null;
  const name = characterName(who, t);
  const aura = style.aura !== "none" ? AURA_TOKEN[style.aura] : "var(--gold)";

  const next = () => {
    if (!done) return setTyped(chars.length);
    sfx.move();
    setPick((p) => pickIndex(texts.length, Math.random(), p));
  };

  return (
    <motion.section
      className={`cp is-${ctx.situation}`}
      style={{ "--cp-aura": aura } as CSSProperties}
      initial={still ? { opacity: 0 } : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <button className="cp-box" onClick={next} aria-label={`${name}: ${text}. ${t("companion.next")}`} title={t("companion.next")}>
        <span className="cp-face" aria-hidden>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={who.id} className="cp-face-in" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <CharacterImage c={who} />
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="cp-talk">
          <span className="cp-head">
            <span className="tag">{t(`companion.tags.${ctx.situation}`)}</span>
            <b className="cp-name">{name}</b>
            <span className="cp-sit muted">{t(`companion.situations.${ctx.situation}`)}</span>
          </span>
          <span className="cp-text" aria-hidden>
            {chars.slice(0, typed).join("")}
            <span className="cp-ghost">{chars.slice(typed).join("")}</span>
          </span>
          <span className={`cp-more ${done ? "is-on" : ""}`} aria-hidden />
        </span>
      </button>
    </motion.section>
  );
}

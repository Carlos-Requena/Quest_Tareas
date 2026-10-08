import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { sfx } from "../../../lib/sfx";
import { BACKDROP_EXIT, MODAL_EXIT } from "../../../lib/motion";
import { BUILTIN_CHARACTERS } from "../../menu/characters";
import { Sigil } from "../../menu/components/MenuIcons";
import { BUILTIN_ILLUSTRATIONS } from "../../temporal/heroes";
import { closeCustomize, useCustomizeUi, type CustomizeTab } from "../ui";
import { BountyPanel } from "./BountyPanel";
import { CastPanel } from "./CastPanel";
import { BrushIcon, PortraitIcon, PosterIcon } from "./CustomizeIcons";
import "../customize.css";

/**
 * Ventana de personalización, encima del menú de opciones: a la izquierda, una pestaña por
 * cosa que se personaliza (como la ventana de misiones de un gacha); a la derecha, su rejilla
 * de retratos con los huecos «+» para añadir imágenes.
 */
export function CustomizeWindow() {
  const open = useCustomizeUi((s) => s.open);
  return <AnimatePresence>{open && <Window key="customize" />}</AnimatePresence>;
}

function Window() {
  const { t } = useTranslation();
  const tab = useCustomizeUi((s) => s.tab);
  const characters = useGame((s) => s.state.characters);
  const arts = useGame((s) => s.state.temporalArts);

  // Escape: del editor de frases a la rejilla y, desde la rejilla, cierra. Los campos de texto
  // se quedan con su Escape (borrar o cancelar) y lo marcan como atendido.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      const ui = useCustomizeUi.getState();
      if (ui.character) {
        sfx.move();
        ui.set({ character: undefined });
      } else close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const close = () => {
    sfx.move();
    closeCustomize();
  };

  return (
    <motion.div className="modal-bg cz-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={BACKDROP_EXIT} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <motion.section
        className="cz"
        role="dialog"
        aria-label={t("customize.title")}
        initial={{ opacity: 0, x: 40, skewX: -3 }}
        animate={{ opacity: 1, x: 0, skewX: 0 }}
        exit={{ opacity: 0, x: 30, transition: MODAL_EXIT }}
        transition={{ type: "spring", stiffness: 340, damping: 32 }}
      >
        <aside className="cz-side">
          <header className="cz-head">
            <span className="cz-head-ico">
              <BrushIcon />
            </span>
            <span className="tag">Customize</span>
            <span className="sec-sub">{t("customize.title")}</span>
          </header>
          <nav className="cz-tabs" role="tablist" aria-label={t("customize.title")}>
            <Tab id="cast" title="Cast" sub={t("customize.tabs.cast")} icon={<PortraitIcon />} n={BUILTIN_CHARACTERS.length + characters.size} />
            <Tab id="bounties" title="Bounties" sub={t("customize.tabs.bounties")} icon={<PosterIcon />} n={BUILTIN_ILLUSTRATIONS.length + arts.size} />
          </nav>
          <span className="cz-seal" aria-hidden>
            <Sigil />
          </span>
        </aside>

        <div className="cz-main" role="tabpanel">
          {tab === "cast" ? <CastPanel /> : <BountyPanel />}
        </div>

        <button className="cz-x" onClick={close} aria-label={t("customize.close")} title={t("customize.close")}>
          <span aria-hidden>×</span>
        </button>
      </motion.section>
    </motion.div>
  );
}

/** Pestaña de la columna izquierda: su icono en un rombo, el rótulo en inglés, su nombre y cuántas imágenes hay. */
function Tab({ id, title, sub, icon, n }: { id: CustomizeTab; title: string; sub: string; icon: ReactNode; n: number }) {
  const on = useCustomizeUi((s) => s.tab === id);
  return (
    <button
      role="tab"
      aria-selected={on}
      className={`cz-tab ${on ? "is-on" : ""}`}
      onClick={() => {
        if (on) return;
        sfx.move();
        useCustomizeUi.getState().set({ tab: id, character: undefined });
      }}
    >
      <span className="cz-tab-ico" aria-hidden>
        {icon}
      </span>
      <span className="cz-tab-txt">
        <b>{title}</b>
        <span>{sub}</span>
      </span>
      <span className="num cz-tab-n">{n}</span>
    </button>
  );
}

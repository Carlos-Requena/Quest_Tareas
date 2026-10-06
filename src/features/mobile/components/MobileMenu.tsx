import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { setMuted, sfx } from "../../../lib/sfx";
import { useMuted } from "../../../lib/useMuted";
import { BACKDROP_EXIT } from "../../../lib/motion";
import { LangSwitch } from "../../../components/Header";
import { BagIcon } from "../../items";
import { DiaryIcon, openChronicle } from "../../chronicle";
import { MusicControl } from "../../music";
import { SyncControl } from "../../sync";
import { useMobileUi } from "../ui";
import { SearchIcon, openSearch } from "../../search";
import { NotifyMenuToggle } from "../../notifications";

/**
 * Menú «Más» del teléfono: lo que en el escritorio está en la cabecera y no cabe en la barra
 * de abajo. Usa los mismos controles (idioma, música, Google Drive); su CSS despliega aquí
 * los paneles que en el escritorio salen al pasar el ratón.
 */
export function MobileMenu() {
  const open = useMobileUi((s) => s.menu);
  const setMenu = useMobileUi((s) => s.setMenu);
  const muted = useMuted();
  const { t } = useTranslation();

  const win = (fn: () => void) => () => {
    sfx.move();
    setMenu(false);
    fn();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bg"
            className="mmenu-bg"
            onClick={() => setMenu(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={BACKDROP_EXIT}
          />
          <motion.div
            key="menu"
            className="mmenu"
            role="dialog"
            aria-label={t("mobile.menu.title")}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 40 }}
          >
            <button className="mmenu-grip" aria-label={t("mobile.menu.close")} onClick={() => setMenu(false)} />
            <div className="mmenu-wins">
              <button className="mmenu-win" onClick={win(() => useGame.getState().setCollection("inventory"))}>
                <BagIcon />
                {t("items.open")}
              </button>
              <button className="mmenu-win" onClick={win(() => openChronicle())}>
                <DiaryIcon />
                {t("chronicle.open")}
              </button>
              <button className="mmenu-win is-wide" onClick={win(() => openSearch())}>
                <SearchIcon />
                {t("search.title")}
              </button>
            </div>
            <Row label={t("mobile.menu.language")}>
              <LangSwitch />
            </Row>
            <Row label={t("mobile.menu.music")}>
              <MusicControl />
            </Row>
            <Row label={t("mobile.menu.sound")}>
              <button className={`mmenu-toggle ${muted ? "" : "on"}`} aria-pressed={!muted} onClick={() => setMuted(!muted)}>
                {muted ? t("mobile.menu.soundOff") : t("mobile.menu.soundOn")}
              </button>
            </Row>
            <Row label={t("notifications.menu")}>
              <NotifyMenuToggle />
            </Row>
            <Row label={t("mobile.menu.sync")} wide>
              <SyncControl />
            </Row>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Row({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={`mmenu-row ${wide ? "is-wide" : ""}`}>
      <span className="mmenu-lbl">{label}</span>
      {children}
    </div>
  );
}

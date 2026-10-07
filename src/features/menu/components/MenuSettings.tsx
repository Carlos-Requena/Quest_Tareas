import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { setMuted } from "../../../lib/sfx";
import { useMuted } from "../../../lib/useMuted";
import { LangSwitch } from "../../../components/Header";
import { MusicControl } from "../../music";
import { SyncControl } from "../../sync";
import { NotifyButton, NotifyMenuToggle } from "../../notifications";
import { useIsPhone } from "../../mobile/phone";

/**
 * Ajustes del equipo: idioma, música, sonido, avisos y Google Drive. Son los mismos controles
 * que antes estaban en la cabecera. En el escritorio van en la barra de arriba del menú, como
 * iconos con su desplegable al pasar el ratón; en el teléfono, que no tiene ratón, en filas con
 * su nombre y los desplegables abiertos (como el antiguo menú «Más»).
 */
export function MenuSettings() {
  const phone = useIsPhone();
  const muted = useMuted();
  const { t } = useTranslation();

  if (!phone) {
    return (
      <div className="mn-set" role="group" aria-label={t("menu.settings.title")}>
        <LangSwitch />
        <MusicControl />
        <button className="mute" title={muted ? t("header.soundOn") : t("header.mute")} aria-pressed={muted} onClick={() => setMuted(!muted)}>
          {muted ? "♪̸" : "♪"}
        </button>
        <NotifyButton />
        <SyncControl />
      </div>
    );
  }

  return (
    <section className="mn-set is-rows" aria-label={t("menu.settings.title")}>
      <h3 className="mn-set-h">
        <span className="gem" />
        <span className="tag">Settings</span>
        <span className="sec-sub">{t("menu.settings.title")}</span>
        <span className="sec-line" />
      </h3>
      <Row label={t("menu.settings.language")}>
        <LangSwitch />
      </Row>
      <Row label={t("menu.settings.music")}>
        <MusicControl />
      </Row>
      <Row label={t("menu.settings.sound")}>
        <button className={`mmenu-toggle ${muted ? "" : "on"}`} aria-pressed={!muted} onClick={() => setMuted(!muted)}>
          {muted ? t("menu.settings.soundOff") : t("menu.settings.soundOn")}
        </button>
      </Row>
      <Row label={t("notifications.menu")}>
        <NotifyMenuToggle />
      </Row>
      <Row label={t("menu.settings.sync")} wide>
        <SyncControl />
      </Row>
    </section>
  );
}

function Row({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={`mn-row ${wide ? "is-wide" : ""}`}>
      <span className="mn-row-lbl">{label}</span>
      {children}
    </div>
  );
}

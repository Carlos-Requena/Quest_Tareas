import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useGame } from "../store/game";
import { useTemporalUi } from "../features/temporal";
import { BagIcon } from "../features/items";
import { LanternIcon, openMerchant } from "../features/merchant";
import { HelmetIcon, openCharacter } from "../features/equipment";

function Key({ k, label }: { k: string; label: string }) {
  return (
    <span className="ft-key">
      <kbd>{k}</kbd>
      {label}
    </span>
  );
}

/** Las ventanas (objetos, mercader y personaje). En una ventana estrecha queda solo su icono, el de la cabecera. */
function Windows() {
  const setCollection = useGame((s) => s.setCollection);
  const { t } = useTranslation();
  const win = (k: string, label: string, icon: ReactNode, open: () => void) => (
    <button className="ft-new ft-items ft-win" onClick={open} title={`${label} (${k})`}>
      <kbd>{k}</kbd>
      <span className="ft-ico">{icon}</span>
      <span className="ft-lbl">{label}</span>
    </button>
  );
  return (
    <>
      {win("I", t("items.open"), <BagIcon />, () => setCollection("inventory"))}
      {win("C", t("merchant.open"), <LanternIcon />, () => openMerchant())}
      {win("P", t("equipment.open"), <HelmetIcon />, () => openCharacter())}
    </>
  );
}

export function Footer() {
  const setCreating = useGame((s) => s.setCreating);
  const section = useGame((s) => s.section);
  const { t } = useTranslation();
  if (section === "temporal") {
    return (
      <footer className="ft">
        <Key k="Enter" label={t("temporal.footer.open")} />
        <Key k="T" label={t("temporal.footer.switchToBoard")} />
        <Key k="H" label={t("horizon.label")} />
        <Windows />
        <button className="ft-new" onClick={() => useTemporalUi.getState().setForm({ mode: "create" })}>
          <kbd>N</kbd>
          {t("temporal.footer.new")}
        </button>
        <span className="ft-right muted">↑↓←→ {t("temporal.footer.board")}</span>
      </footer>
    );
  }
  return (
    <footer className="ft">
      <Key k="Enter" label={t("footer.acceptReport")} />
      <Key k="X" label={t("footer.abandon")} />
      <Key k="+" label={t("footer.progress")} />
      <Key k="Q E" label={t("footer.category")} />
      <Key k="H" label={t("horizon.label")} />
      <Key k="T" label={t("temporal.footer.switchToTemporal")} />
      <Windows />
      <button className="ft-new" onClick={() => setCreating(true)}>
        <kbd>N</kbd>
        {t("footer.newQuest")}
      </button>
      <span className="ft-right muted">↑↓←→ {t("footer.board")}</span>
    </footer>
  );
}

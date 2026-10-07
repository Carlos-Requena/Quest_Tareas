import { useTranslation } from "react-i18next";
import { useGame } from "../store/game";
import { useTemporalUi } from "../features/temporal";
import { addBlock, useCalendarUi } from "../features/calendar";
import { MenuFooterButton } from "../features/menu";

function Key({ k, label }: { k: string; label: string }) {
  return (
    <span className="ft-key">
      <kbd>{k}</kbd>
      {label}
    </span>
  );
}

export function Footer() {
  const setCreating = useGame((s) => s.setCreating);
  const section = useGame((s) => s.section);
  const { t } = useTranslation();
  if (section === "calendar") {
    return (
      <footer className="ft">
        <Key k="← →" label={t("calendar.footer.move")} />
        <Key k="V" label={t("calendar.footer.view")} />
        <Key k="H" label={t("calendar.footer.today")} />
        <Key k="S" label={t("calendar.footer.back")} />
        <MenuFooterButton />
        <button className="ft-new" onClick={() => addBlock(useCalendarUi.getState().day)}>
          <kbd>N</kbd>
          {t("calendar.footer.new")}
        </button>
      </footer>
    );
  }
  if (section === "temporal") {
    return (
      <footer className="ft">
        <Key k="Enter" label={t("temporal.footer.open")} />
        <Key k="T" label={t("temporal.footer.switchToBoard")} />
        <Key k="H" label={t("horizon.label")} />
        <MenuFooterButton />
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
      <Key k="R" label={t("editing.open")} />
      <Key k="/" label={t("search.title")} />
      <Key k="T" label={t("temporal.footer.switchToTemporal")} />
      <MenuFooterButton />
      <button className="ft-new" onClick={() => setCreating(true)} title={t("quickadd.full")}>
        <kbd>⇧N</kbd>
        {t("footer.newQuest")}
      </button>
      <span className="ft-right muted">↑↓←→ {t("footer.board")}</span>
    </footer>
  );
}

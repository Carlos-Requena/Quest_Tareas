import { useTranslation } from "react-i18next";
import { useGame } from "../store/game";

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
  const setCollection = useGame((s) => s.setCollection);
  const { t } = useTranslation();
  return (
    <footer className="ft">
      <Key k="Enter" label={t("footer.acceptReport")} />
      <Key k="X" label={t("footer.abandon")} />
      <Key k="+" label={t("footer.progress")} />
      <Key k="Q E" label={t("footer.category")} />
      <button className="ft-new ft-items" onClick={() => setCollection("inventory")}>
        <kbd>I</kbd>
        {t("items.open")}
      </button>
      <button className="ft-new" onClick={() => setCreating(true)}>
        <kbd>N</kbd>
        {t("footer.newQuest")}
      </button>
      <span className="ft-right muted">↑↓←→ {t("footer.board")}</span>
    </footer>
  );
}

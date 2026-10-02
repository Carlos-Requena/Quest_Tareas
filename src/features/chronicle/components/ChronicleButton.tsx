import { useTranslation } from "react-i18next";
import { sfx } from "../../../lib/sfx";
import { openChronicle } from "../ui";

/** Botón de la crónica en la cabecera. */
export function ChronicleButton() {
  const { t } = useTranslation();
  return (
    <button
      className="hdr-pill chronicle-btn"
      title={t("chronicle.openTitle")}
      aria-label={t("chronicle.open")}
      onClick={() => {
        sfx.move();
        openChronicle();
      }}
    >
      <DiaryIcon />
    </button>
  );
}

/** Diario cerrado con su cinta (cabecera y pie). */
export function DiaryIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path d="M3 1.5h7.5a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path d="M4.2 1.5v11" stroke="currentColor" strokeWidth=".9" />
      <path d="M6.3 4.5h3.4M6.3 6.5h3.4M6.3 8.5h2.2" stroke="currentColor" strokeWidth=".8" strokeLinecap="round" />
      <path d="M9.5 12.5v1.3l.8-.6.8.6v-1.3" fill="currentColor" />
    </svg>
  );
}

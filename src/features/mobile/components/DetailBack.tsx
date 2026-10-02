import { useTranslation } from "react-i18next";
import { sfx } from "../../../lib/sfx";
import { useMobileUi } from "../ui";

/** Barra de arriba del detalle a pantalla completa, para volver al tablón. Solo en el teléfono. */
export function DetailBack() {
  const { t } = useTranslation();
  return (
    <div className="mback">
      <button
        className="mback-btn"
        onClick={() => {
          sfx.move();
          useMobileUi.getState().closeDetail();
        }}
      >
        <svg width="10" height="16" viewBox="0 0 10 16" aria-hidden>
          <path d="M8 2 2 8l6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {t("mobile.back")}
      </button>
    </div>
  );
}

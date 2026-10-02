import { useTranslation } from "react-i18next";
import { sfx } from "../../../lib/sfx";
import { openMerchant } from "../ui";
import "../merchant.css";

/** Botón de la cabecera, junto al oro: abre el escaparate de Hu Tao. */
export function MerchantButton() {
  const { t } = useTranslation();
  return (
    <button
      className="hdr-pill merchant-btn"
      title={t("merchant.openTitle")}
      aria-label={t("merchant.open")}
      onClick={() => {
        sfx.move();
        openMerchant();
      }}
    >
      <LanternIcon />
    </button>
  );
}

/** Farol de la funeraria (cabecera y pie). */
export function LanternIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="merchant-icon">
      <path d="M7 .8v1.4M5 2.2h4" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M4.2 3.4h5.6c1 1.6 1 5.6 0 7.2H4.2c-1-1.6-1-5.6 0-7.2z" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <path d="M4 3.4h6M4 10.6h6M7 3.4v7.2" stroke="currentColor" strokeWidth=".8" />
      <path d="M7 10.6v2.4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

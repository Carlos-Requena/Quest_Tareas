import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { sfx } from "../../../lib/sfx";
import { num } from "../../../i18n";
import "../items.css";

/** Botón de la cabecera: unidades en el inventario; abre la ventana de objetos. */
export function ItemsButton() {
  const { t } = useTranslation();
  const units = useGame((s) => Object.values(s.state.player.inventory).reduce((a, b) => a + b, 0));
  const setCollection = useGame((s) => s.setCollection);
  return (
    <button
      className="items-btn"
      title={t("items.openTitle")}
      onClick={() => {
        sfx.move();
        setCollection("inventory");
      }}
    >
      <BagIcon />
      <b className="num">{num(units)}</b>
    </button>
  );
}

/** Bolsa de los objetos (cabecera y pie). */
export function BagIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="bag-icon">
      <path d="M4.5 4.5V3.6a2.5 2.5 0 0 1 5 0v.9" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2.5 4.5h9l-.8 8h-7.4z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <rect x="5.6" y="7.2" width="2.8" height="2.8" transform="rotate(45 7 8.6)" fill="currentColor" />
    </svg>
  );
}

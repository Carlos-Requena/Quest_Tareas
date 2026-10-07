import { useTranslation } from "react-i18next";
import { openMenu } from "../actions";
import { MenuIcon } from "./MenuIcons";

/**
 * Pestaña del menú en la cabecera: un paralelogramo dorado que se ilumina al pasar el ratón.
 * Abre la pantalla del menú, donde están el mercader, el personaje, los objetos, la crónica
 * y los ajustes. En el teléfono no se ve: el menú está en la barra de abajo.
 */
export function MenuButton() {
  const { t } = useTranslation();
  return (
    <button className="menu-btn" title={t("menu.openTitle")} aria-label={t("menu.open")} onClick={openMenu}>
      <span className="menu-btn-ico">
        <MenuIcon />
      </span>
      <span className="menu-btn-lbl">Menu</span>
    </button>
  );
}

/** Botón del pie (tecla O): sustituye a los de cada ventana. En una ventana estrecha queda solo su icono. */
export function MenuFooterButton() {
  const { t } = useTranslation();
  return (
    <button className="ft-new ft-win" onClick={openMenu} title={t("menu.openTitle")}>
      <kbd>O</kbd>
      <span className="ft-ico">
        <MenuIcon />
      </span>
      <span className="ft-lbl">{t("menu.open")}</span>
    </button>
  );
}

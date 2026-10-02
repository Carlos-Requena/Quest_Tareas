import { useTranslation } from "react-i18next";
import { sfx } from "../../../lib/sfx";
import { openCharacter } from "../ui";
import "../equipment.css";

/** Botón de la cabecera, junto al rango y el nivel: abre la ficha del personaje. */
export function CharacterButton() {
  const { t } = useTranslation();
  return (
    <button
      className="hdr-pill character-btn"
      title={t("equipment.openTitle")}
      aria-label={t("equipment.open")}
      onClick={() => {
        sfx.move();
        openCharacter();
      }}
    >
      <HelmetIcon />
    </button>
  );
}

/** Yelmo del personaje (cabecera y pie). */
export function HelmetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path d="M2.6 11.5V7.2a4.4 4.4 0 0 1 8.8 0v4.3H9V8.6H5v2.9z" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M7 2.8V.9M7 5.6v2.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

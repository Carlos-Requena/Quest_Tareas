import { useTranslation } from "react-i18next";
import type { GearDef } from "../../merchant/model";
import { GearArt, gearStyle } from "../../merchant/components/GearArt";
import { gearName } from "../../armory/labels";

interface Props {
  gear: GearDef;
  /** Número dentro de su almanaque (#001). */
  no?: number;
  /** Aún no comprada a Hu Tao. */
  locked?: boolean;
  selected?: boolean;
  onClick?(): void;
}

/** Cromo de una pieza de equipo en el almanaque: el mismo marco que los objetos, con su arte de ranura. */
export function GearTile({ gear, no, locked, selected, onClick }: Props) {
  const { t } = useTranslation();
  const name = gearName(gear, t);
  return (
    <button
      type="button"
      className={`itile is-gear ${locked ? "is-locked" : ""} ${selected ? "is-selected" : ""}`}
      style={gearStyle(gear)}
      onClick={onClick}
      title={name}
    >
      <span className="itile-frame">
        <GearArt gear={gear} stars={!locked} className="iart" />
        {no !== undefined && <span className="itile-no num">#{String(no).padStart(3, "0")}</span>}
      </span>
      <span className="itile-name">{name}</span>
    </button>
  );
}

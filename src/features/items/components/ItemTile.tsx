import type { CSSProperties } from "react";
import { RARITY_META, type ItemDef } from "../model";
import "../items.css";

/** Estilo con el color de la rareza en `--rc`, para cualquier elemento. */
export const rarityStyle = (item: Pick<ItemDef, "rarity">) => ({ "--rc": RARITY_META[item.rarity].color }) as CSSProperties;

/** Arte del objeto: imagen sobre el fondo de su rareza, o un monograma si no tiene imagen. */
export function ItemArt({ item, locked = false }: { item: ItemDef; locked?: boolean }) {
  return (
    <span className="iart" style={rarityStyle(item)}>
      {item.image ? (
        <img src={item.image} alt="" draggable={false} />
      ) : (
        <span className="iart-mono" aria-hidden>
          {[...item.name.trim()][0]?.toUpperCase() ?? "?"}
        </span>
      )}
      {!locked && <span className="iart-stars" aria-hidden>{"★".repeat(RARITY_META[item.rarity].stars)}</span>}
    </span>
  );
}

interface Props {
  item: ItemDef;
  /** Número del almanaque (#001), como en un álbum de cromos. */
  no?: number;
  count?: number;
  /** No conseguido: silueta. */
  locked?: boolean;
  selected?: boolean;
  isNew?: boolean;
  onClick?(): void;
}

/** Cromo del objeto. El fondo es el color de su rareza; el nombre toma ese color al pasar el ratón. */
export function ItemTile({ item, no, count, locked, selected, isNew, onClick }: Props) {
  return (
    <button
      type="button"
      className={`itile ${locked ? "is-locked" : ""} ${selected ? "is-selected" : ""}`}
      style={rarityStyle(item)}
      onClick={onClick}
      title={item.name}
    >
      <span className="itile-frame">
        <ItemArt item={item} locked={locked} />
        {no !== undefined && <span className="itile-no num">#{String(no).padStart(3, "0")}</span>}
        {count !== undefined && count > 0 && <span className="itile-count num">×{count}</span>}
        {isNew && <span className="itile-new tag">NEW</span>}
      </span>
      <span className="itile-name">{item.name}</span>
    </button>
  );
}

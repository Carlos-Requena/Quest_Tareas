import type { CSSProperties } from "react";
import { RARITY_META } from "../../items/model";
import { starsOf, type GearDef } from "../model";
import { SlotGlyph } from "./SlotGlyph";
import "../merchant.css";

/** Estilo con el color de la rareza en `--rc`. */
export const gearStyle = (g: Pick<GearDef, "rarity">) => ({ "--rc": RARITY_META[g.rarity].color }) as CSSProperties;

type ArtGear = Pick<GearDef, "name" | "rarity" | "slot" | "image">;

/** Arte de una pieza: su imagen sobre el fondo de su rareza o, sin imagen, el glifo de su ranura. */
export function GearArt({ gear, stars = true, className = "" }: { gear: ArtGear; stars?: boolean; className?: string }) {
  return (
    <span className={`gart ${className}`} style={gearStyle(gear)}>
      {gear.image ? <img src={gear.image} alt="" draggable={false} /> : <SlotGlyph slot={gear.slot} className="gart-glyph" />}
      {stars && (
        <span className="gart-stars" aria-hidden>
          {"★".repeat(starsOf(gear))}
        </span>
      )}
    </span>
  );
}

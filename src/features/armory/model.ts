// Modelo puro de la armería de serie: las piezas del mercader que trae la app.
// No son eventos: están en el código, así que las tiene todo el que instala la app
// (también quien ya tenía datos). El mercader las suma a su catálogo (merchant/model.ts).
// Sin React, sin store, sin Tauri, sin DOM.

import type { GearDef } from "../merchant/model";
import { ARMORY, type ArmoryEntry, type ArmorySource } from "./catalog";
import { backdropSvg, iconSvg, svgUrl } from "./art";
import { armoryEs } from "./i18n";

/** Prefijo del id de las piezas de serie. Las del jugador tienen un UUID: no chocan. */
export const ARMORY_PREFIX = "armory-";

export const armoryId = (key: string) => ARMORY_PREFIX + key;
export const isBuiltinGear = (id: string) => BUILTIN_GEAR.has(id);
/** La clave de una pieza de serie en el diccionario (`armory.items.<key>`). */
export const armoryKey = (id: string) => (isBuiltinGear(id) ? id.slice(ARMORY_PREFIX.length) : undefined);

type ItemKey = keyof typeof armoryEs.items;

function build(e: ArmoryEntry): GearDef {
  const tx = armoryEs.items[e.key as ItemKey];
  const image = "scene" in e.icon ? svgUrl(backdropSvg(e.icon.scene, e.key)) : svgUrl(iconSvg(e.icon));
  return {
    id: armoryId(e.key),
    // En español por defecto; la interfaz lo traduce (gearName).
    name: tx?.name ?? e.key,
    slot: e.slot,
    rarity: e.rarity,
    description: tx?.desc ?? "",
    image,
    // Siempre a la venta desde «antes»: no cuentan como recién llegadas.
    createdAt: 0,
  };
}

/** Todas las piezas de serie, por id. Se construye una vez al cargar el módulo. */
export const BUILTIN_GEAR: ReadonlyMap<string, GearDef> = new Map(ARMORY.map((e) => [armoryId(e.key), build(e)]));

const SOURCE_OF = new Map(ARMORY.map((e) => [armoryId(e.key), e.source]));
/** De dónde viene la idea de una pieza de serie. */
export const armorySource = (id: string): ArmorySource | undefined => SOURCE_OF.get(id);

/**
 * Imagen grande de un fondo de serie: la misma escena del icono (SVG, se ve nítida a
 * cualquier tamaño). Las de los fondos del jugador están en el almacén de binarios.
 */
export const builtinArt = (id: string | undefined): string | undefined => {
  const g = id ? BUILTIN_GEAR.get(id) : undefined;
  return g?.slot === "backdrop" ? g.image : undefined;
};

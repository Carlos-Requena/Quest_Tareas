import type { TFunction } from "i18next";
import type { GearDef } from "../merchant/model";
import { armoryKey } from "./model";

/** Nombre de una pieza en el idioma de la interfaz: las de serie se traducen; las del jugador, no. */
export function gearName(g: Pick<GearDef, "id" | "name">, t: TFunction): string {
  const key = armoryKey(g.id);
  return key ? t(`armory.items.${key}.name`, { defaultValue: g.name }) : g.name;
}

export function gearDescription(g: Pick<GearDef, "id" | "description">, t: TFunction): string {
  const key = armoryKey(g.id);
  return key ? t(`armory.items.${key}.desc`, { defaultValue: g.description }) : g.description;
}

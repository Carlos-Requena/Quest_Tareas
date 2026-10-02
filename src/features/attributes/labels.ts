import type { TFunction } from "i18next";
import { cleanArea, knownArea, knownAreaOfKey, KNOWN_AREA_IDS, type Attribute } from "./model";

/** Nombre de un atributo en el idioma de la interfaz: traducido si es un área conocida. */
export function attributeName(a: Pick<Attribute, "key" | "name">, t: TFunction): string {
  const known = knownAreaOfKey(a.key);
  return known ? t(`attributes.areas.${known}`) : a.name;
}

/** Un área escrita en una quest, traducida si es conocida («Salud» → «健康» en japonés). */
export function areaName(area: string | undefined, t: TFunction): string {
  const known = knownArea(area);
  return known ? t(`attributes.areas.${known}`) : cleanArea(area);
}

/** Sugerencias para el campo «Área»: las áreas conocidas en este idioma y las que ya tienes. */
export function areaSuggestions(attrs: Pick<Attribute, "key" | "name">[], t: TFunction): string[] {
  const names = [...attrs.map((a) => attributeName(a, t)), ...KNOWN_AREA_IDS.map((id) => t(`attributes.areas.${id}`))];
  return [...new Set(names)];
}

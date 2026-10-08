import { describe, expect, it } from "vitest";
import { project } from "../../domain/projection";
import type { EventBody } from "../../domain/events";
import { characterDef, randomStream, withMeta } from "../../test/streams";
import { cleanPatch, DEFAULT_STYLE, isCustomized, styleOf } from "./model";

const set = (characterId: string, style: object): EventBody => ({ type: "character_style_set", characterId, style: style as never });

describe("estilo de un personaje", () => {
  it("sin cambios, los valores por defecto", () => {
    const st = project([]);
    expect(styleOf(st.characterStyles, "builtin:kazuma")).toEqual(DEFAULT_STYLE);
    expect(styleOf(st.characterStyles, undefined)).toEqual(DEFAULT_STYLE);
  });

  it("los parches se suman y lo no tocado sigue al valor por defecto", () => {
    const st = project(withMeta([set("builtin:aqua", { wind: 3 }), set("builtin:aqua", { aura: "azure", entrance: "gacha" }), set("builtin:aqua", { wind: 0 })]));
    expect(st.characterStyles.get("builtin:aqua")).toEqual({ wind: 0, aura: "azure", entrance: "gacha" });
    expect(styleOf(st.characterStyles, "builtin:aqua")).toEqual({ ...DEFAULT_STYLE, wind: 0, aura: "azure", entrance: "gacha" });
    expect(isCustomized(st.characterStyles, "builtin:aqua")).toBe(true);
    expect(isCustomized(st.characterStyles, "builtin:mio")).toBe(false);
  });

  it("restablecer vuelve a los valores por defecto", () => {
    const st = project(withMeta([set("builtin:aqua", { breath: 3 }), { type: "character_style_reset", characterId: "builtin:aqua" }]));
    expect(st.characterStyles.has("builtin:aqua")).toBe(false);
  });

  it("los campos desconocidos o fuera de rango se ignoran; un parche que se queda vacío no hace nada", () => {
    expect(cleanPatch({ breath: 7, sway: 2, aura: "rosa", particles: "snow", shine: "sí", fade: true, nuevo: 1 })).toEqual({ sway: 2, particles: "snow", fade: true });
    expect(cleanPatch(null)).toEqual({});
    const st = project(withMeta([set("builtin:aqua", { breath: 9, aura: "rosa" })]));
    expect(st.characterStyles.has("builtin:aqua")).toBe(false);
  });

  it("de un personaje que no existe o que se quitó, no; quitarlo se lleva su estilo", () => {
    const st = project(
      withMeta([
        set("nadie", { breath: 3 }),
        { type: "character_added", character: characterDef("c") },
        set("c", { aura: "jade" }),
        { type: "character_removed", characterId: "c" },
        set("c", { aura: "amber" }),
        { type: "character_added", character: characterDef("d") },
        set("d", { particles: "embers" }),
      ]),
    );
    expect([...st.characterStyles.keys()]).toEqual(["d"]);
  });

  it("randomStream los incluye", () => {
    const ev = randomStream("living", 4000);
    for (const type of ["character_style_set", "character_style_reset"]) expect(ev.some((e) => e.type === type)).toBe(true);
  });
});

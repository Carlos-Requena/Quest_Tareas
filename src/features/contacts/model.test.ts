import { describe, expect, it } from "vitest";
import { cleanContacts, contactHref, contactValid } from "./model";
import { project } from "../../domain/projection";
import { at, questDef, T0, temporalDef } from "../../test/streams";

describe("contactos", () => {
  it("validan lo que se puede abrir", () => {
    expect(contactValid("phone", "+34 600 12 34 56")).toBe(true);
    expect(contactValid("phone", "(91) 555-12-12")).toBe(true);
    expect(contactValid("phone", "llamar a Ana")).toBe(false);
    expect(contactValid("phone", "12")).toBe(false);
    expect(contactValid("email", "ana@correo.es")).toBe(true);
    expect(contactValid("email", "ana@correo")).toBe(false);
    expect(contactValid("link", "www.ejemplo.es/cita?x=1")).toBe(true);
    expect(contactValid("link", "https://ejemplo.es")).toBe(true);
    // Nada de otros esquemas: el enlace siempre acaba en https.
    expect(contactValid("link", "javascript:alert(1).x")).toBe(false);
    expect(contactValid("link", "file:///etc/passwd")).toBe(false);
    expect(contactValid("address", "Calle Mayor 1")).toBe(true);
    expect(contactValid("address", "  ")).toBe(false);
  });

  it("cada tipo abre su app: tel, mailto, wa.me, https y Mapas", () => {
    expect(contactHref({ kind: "phone", value: "+34 600 12-34 56" })).toBe("tel:+34600123456");
    expect(contactHref({ kind: "whatsapp", value: "+34 600 123 456" })).toBe("https://wa.me/34600123456");
    expect(contactHref({ kind: "email", value: " ana@correo.es " })).toBe("mailto:ana@correo.es");
    expect(contactHref({ kind: "link", value: "ejemplo.es" })).toBe("https://ejemplo.es");
    expect(contactHref({ kind: "link", value: "http://ejemplo.es/a" })).toBe("https://ejemplo.es/a");
    expect(contactHref({ kind: "address", value: "Calle Mayor 1, Madrid" })).toBe("https://maps.apple.com/?q=Calle%20Mayor%201%2C%20Madrid");
    expect(contactHref({ kind: "phone", value: "sin número" })).toBeUndefined();
    // Solo tel:, mailto: y https: (lo que permiten las capabilities).
    for (const kind of ["phone", "email", "whatsapp", "link", "address"] as const)
      expect(contactHref({ kind, value: kind === "email" ? "a@b.cc" : kind === "link" ? "a.cc" : "600 000 000" })).toMatch(/^(tel:|mailto:|https:\/\/)/);
  });

  it("al leer se limpian: sin ids repetidos, tipos desconocidos, vacíos ni de más", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ id: `c${i}`, kind: "phone", name: "", value: "600" }));
    expect(cleanContacts(many)).toHaveLength(6);
    expect(
      cleanContacts([
        { id: "a", kind: "phone", name: "  Ana  ", value: " 600 000 000 " },
        { id: "a", kind: "email", name: "", value: "x@y.zz" },
        { id: "b", kind: "fax", name: "", value: "1" },
        { id: "c", kind: "email", name: "", value: "   " },
        null,
        "texto",
      ]),
    ).toEqual([{ id: "a", kind: "phone", name: "Ana", value: "600 000 000" }]);
    expect(cleanContacts(undefined)).toEqual([]);
  });

  it("en la proyección: la quest los lleva limpios, sin campo si no hay; los encargos anteriores, []", () => {
    const st = project([
      at(T0, { type: "quest_created", quest: questDef("q", { contacts: [{ id: "k", kind: "email", name: "Tutor", value: "t@u.es" }, { id: "k", kind: "phone", name: "", value: "1" }] }) }),
      at(T0, { type: "quest_created", quest: questDef("v") }),
      at(T0, { type: "temporal_created", temporal: { ...temporalDef("t"), contacts: undefined as never } }),
    ]);
    expect(st.quests.get("q")?.contacts).toEqual([{ id: "k", kind: "email", name: "Tutor", value: "t@u.es" }]);
    expect(st.quests.get("v")?.contacts).toBeUndefined();
    expect(st.temporals.get("t")?.contacts).toEqual([]);
  });
});

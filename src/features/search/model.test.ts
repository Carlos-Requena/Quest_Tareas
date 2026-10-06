import { describe, expect, it } from "vitest";
import { project } from "../../domain/projection";
import { agendaDef, at, itemDef, questDef, T0, temporalDef } from "../../test/streams";
import { fold, search } from "./model";

const st = project([
  at(T0, { type: "quest_created", quest: questDef("a", { title: "Pagar el seguro del coche", description: "Antes del viernes", area: "Administración" }) }),
  at(T0 + 1, { type: "quest_created", quest: questDef("b", { title: "Seguir leyendo", conditions: [{ id: "l", kind: "checklist", label: "Capítulos", target: 2, items: [{ id: "x", text: "Capítulo de la máquina" }] }] }) }),
  at(T0 + 2, { type: "quest_created", quest: questDef("c", { title: "ジムに行く" }) }),
  at(T0 + 3, { type: "temporal_created", temporal: temporalDef("t", { title: "Cita en el taller", place: "Taller Pérez", notes: "Llevar el seguro" }) }),
  at(T0 + 4, { type: "agenda_created", entry: agendaDef("g", { title: "Gimnasio" }) }),
  at(T0 + 5, { type: "item_created", item: itemDef("i", { name: "Poción de Maná" }) }),
]);
const src = { quests: st.quests.values(), temporals: st.temporals.values(), agenda: st.agenda.values(), items: st.items.values() };
const run = (q: string) => search({ quests: st.quests.values(), temporals: st.temporals.values(), agenda: st.agenda.values(), items: st.items.values() }, q);

describe("search", () => {
  it("sin búsqueda, nada", () => {
    expect(search(src, "   ")).toEqual([]);
  });

  it("sin tildes ni mayúsculas, y el título pesa más que el resto", () => {
    const hits = run("SEGURO");
    expect(hits.map((h) => h.id)).toEqual(["a", "t"]);
    expect(hits[1].snippet).toContain("seguro");
    expect(run("administracion")[0].id).toBe("a");
    expect(run("pocion")[0]).toMatchObject({ kind: "item", id: "i" });
  });

  it("todas las palabras tienen que estar", () => {
    expect(run("seguro coche").map((h) => h.id)).toEqual(["a"]);
    expect(run("seguro moto")).toEqual([]);
  });

  it("busca en las casillas de las listas, los lugares y la agenda", () => {
    expect(run("maquina")[0].id).toBe("b");
    expect(run("perez")[0].id).toBe("t");
    expect(run("gimna")[0]).toMatchObject({ kind: "agenda", id: "g" });
  });

  it("katakana e hiragana valen igual", () => {
    expect(fold("ジム")).toBe(fold("じむ"));
    expect(run("じむ")[0].id).toBe("c");
  });
});

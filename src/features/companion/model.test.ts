import { describe, expect, it } from "vitest";
import { project } from "../../domain/projection";
import type { EventBody } from "../../domain/events";
import { characterDef, companionLine, randomStream, T0, withMeta } from "../../test/streams";
import { VOICE_LIMITS } from "../menu/model";
import { companionLinesOf, companionOf, fillLine, pickIndex, situationOf, type DaySummary } from "./model";

const day = (d: Partial<DaySummary>): DaySummary => ({ tonight: 0, streaks: 0, active: 0, due: 0, failed: 0, done: 0, ...d });
const line = (id: string, extra: Parameters<typeof companionLine>[1] = {}): EventBody => ({ type: "companion_line_added", line: companionLine(id, extra) });

describe("situación del día", () => {
  it("de más a menos urgente", () => {
    expect(situationOf(day({ tonight: 1, streaks: 1, active: 1, due: 1, failed: 1, done: 1 }))).toBe("tonight");
    expect(situationOf(day({ streaks: 1, active: 1, due: 1 }))).toBe("streak");
    expect(situationOf(day({ active: 2, due: 1 }))).toBe("active");
    expect(situationOf(day({ due: 3, done: 2 }))).toBe("due");
    expect(situationOf(day({ failed: 1, done: 2 }))).toBe("failed");
    expect(situationOf(day({ done: 2 }))).toBe("clear");
    expect(situationOf(day({}))).toBe("quiet");
  });
});

describe("frases del compañero", () => {
  it("se añaden, se editan y se quitan; las quitadas no vuelven", () => {
    const st = project(
      withMeta([
        line("a", { text: "  Hoy   toca\n{{title}} " }),
        line("b", { situation: "clear", characterId: "builtin:aqua" }),
        { type: "companion_line_updated", lineId: "b", text: "¡Día cumplido!" },
        line("c"),
        { type: "companion_line_removed", lineId: "c" },
        line("c"),
      ]),
    );
    expect([...st.companion.lines.keys()]).toEqual(["a", "b"]);
    expect(st.companion.lines.get("a")?.text).toBe("Hoy toca {{title}}");
    expect(st.companion.lines.get("b")?.text).toBe("¡Día cumplido!");
  });

  it("guardas: vacías, de una situación desconocida, de un personaje que no existe o se quitó, repetidas", () => {
    const st = project(
      withMeta([
        line("vacia", { text: "   " }),
        line("rara", { situation: "boss" as never }),
        line("nadie", { characterId: "nadie" }),
        { type: "character_added", character: characterDef("c") },
        { type: "character_removed", characterId: "c" },
        line("quitado", { characterId: "c" }),
        line("ok", { text: "x".repeat(400) }),
        line("ok", { text: "Otra con el mismo id" }),
        { type: "companion_line_updated", lineId: "ok", text: " " },
      ]),
    );
    expect([...st.companion.lines.keys()]).toEqual(["ok"]);
    expect(st.companion.lines.get("ok")?.text).toHaveLength(VOICE_LIMITS.text);
  });

  it("elegir compañero: uno que exista; sin id, vuelve al de hoy; quitarlo lo devuelve al de hoy y se lleva sus frases", () => {
    const st = project(
      withMeta([
        { type: "companion_chosen", characterId: "nadie" },
        { type: "character_added", character: characterDef("c") },
        { type: "companion_chosen", characterId: "c" },
        line("1", { characterId: "c" }),
        line("2"),
      ]),
    );
    expect(st.companion.chosen).toBe("c");
    const gone = project(
      withMeta([
        { type: "character_added", character: characterDef("c") },
        { type: "companion_chosen", characterId: "c" },
        line("1", { characterId: "c" }),
        line("2"),
        { type: "character_removed", characterId: "c" },
      ]),
    );
    expect(gone.companion.chosen).toBeUndefined();
    expect([...gone.companion.lines.keys()]).toEqual(["2"]);
    const back = project(withMeta([{ type: "companion_chosen", characterId: "builtin:aqua" }, { type: "companion_chosen" }]));
    expect(back.companion.chosen).toBeUndefined();
  });

  it("quién acompaña: el elegido si sigue en la lista; si no, el de hoy", () => {
    expect(companionOf(["builtin:kazuma", "builtin:aqua"], "builtin:kazuma", "builtin:aqua")).toBe("builtin:aqua");
    expect(companionOf(["builtin:kazuma"], "builtin:kazuma", "builtin:aqua")).toBe("builtin:kazuma");
    expect(companionOf(["builtin:kazuma"], "builtin:kazuma", undefined)).toBe("builtin:kazuma");
  });

  it("las de un personaje y una situación, en el orden en que se escribieron", () => {
    const lines = [companionLine("b", { createdAt: T0 + 2 }), companionLine("a", { createdAt: T0 + 1 }), companionLine("c", { situation: "quiet" }), companionLine("d", { characterId: "builtin:aqua" })];
    expect(companionLinesOf(lines, "builtin:kazuma", "due").map((l) => l.id)).toEqual(["a", "b"]);
    expect(companionLinesOf(lines, "builtin:kazuma").map((l) => l.id)).toEqual(["c", "a", "b"]);
  });

  it("rellena los huecos y deja vacío lo que falta", () => {
    expect(fillLine("Hoy toca {{title}} ({{ n }}), quedan {{time}}", { title: "Gimnasio", n: 2, time: "3 h" })).toBe("Hoy toca Gimnasio (2), quedan 3 h");
    expect(fillLine("Vamos, {{title}}{{otro}}", {})).toBe("Vamos, {{otro}}");
  });

  it("otra frase al tocar: distinta de la anterior si hay más de una", () => {
    expect(pickIndex(0, 0.5)).toBe(-1);
    expect(pickIndex(1, 0.9, 0)).toBe(0);
    expect(pickIndex(3, 0.0)).toBe(0);
    expect(pickIndex(3, 0.999)).toBe(2);
    for (let p = 0; p < 3; p++) for (const r of [0, 0.4, 0.7, 0.99]) expect(pickIndex(3, r, p)).not.toBe(p);
  });

  it("randomStream los incluye", () => {
    const ev = randomStream("companion", 4000);
    for (const type of ["companion_chosen", "companion_line_added", "companion_line_updated", "companion_line_removed"]) expect(ev.some((e) => e.type === type)).toBe(true);
  });
});

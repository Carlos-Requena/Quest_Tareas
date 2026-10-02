import { describe, expect, it } from "vitest";
import { describeFailure, failureReport } from "./model";

describe("pantalla de recuperación", () => {
  it("describe un Error con su nombre, su mensaje y las dos pilas", () => {
    const err = new TypeError("x is undefined");
    const f = describeFailure(err, "\n    at QuestCard\n    at App");
    expect(f.message).toBe("TypeError: x is undefined");
    expect(f.stack).toContain("x is undefined");
    expect(f.stack).toContain("React:\nat QuestCard");
  });

  it("acepta cualquier cosa lanzada, no solo errores", () => {
    expect(describeFailure("roto")).toEqual({ message: "roto", stack: "" });
    expect(describeFailure(undefined, null).message).toBe("undefined");
  });

  it("el informe lleva la versión, la hora y el fallo", () => {
    const r = failureReport({ message: "Error: a", stack: "pila" }, { version: "0.1.0", userAgent: "UA", at: Date.UTC(2026, 9, 2) });
    expect(r.split("\n")).toEqual(["Quests 0.1.0 — 2026-10-02T00:00:00.000Z", "UA", "", "Error: a", "pila"]);
  });
});

import { describe, expect, it } from "vitest";
import { comparePos, nextTs, SAME_MOMENT_MS } from "./events";

describe("orden de los eventos", () => {
  it("comparePos ordena por ts y desempata por id", () => {
    expect(comparePos({ ts: 1, id: "z" }, { ts: 2, id: "a" })).toBeLessThan(0);
    expect(comparePos({ ts: 2, id: "a" }, { ts: 2, id: "b" })).toBeLessThan(0);
    expect(comparePos({ ts: 2, id: "b" }, { ts: 2, id: "b" })).toBe(0);
  });

  it("nextTs: un evento nuevo va siempre después del último si el reloj no ha avanzado", () => {
    const last = { ts: 1000, id: "ffff" };
    expect(nextTs(5000, undefined)).toBe(5000);
    expect(nextTs(1001, last)).toBe(1001);
    expect(nextTs(1000, last)).toBe(1001); // mismo milisegundo
    expect(nextTs(1000 - SAME_MOMENT_MS + 1, last)).toBe(1001); // reloj algo atrasado
    expect(nextTs(1000 - SAME_MOMENT_MS, last)).toBe(1000 - SAME_MOMENT_MS); // muy atrasado: se recalculará todo
  });

  it("una ráfaga de eventos en el mismo milisegundo queda en el orden en que se hicieron", () => {
    let last: { ts: number; id: string } | undefined;
    const out: { ts: number; id: string; n: number }[] = [];
    for (let n = 0; n < 50; n++) {
      const e = { ts: nextTs(7000, last), id: Math.random().toString(36).slice(2), n };
      out.push(e);
      last = e;
    }
    expect([...out].sort(comparePos).map((e) => e.n)).toEqual(out.map((e) => e.n));
  });
});

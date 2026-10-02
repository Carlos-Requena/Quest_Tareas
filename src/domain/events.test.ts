import { describe, expect, it } from "vitest";
import { comparePos, MAX_DRIFT_MS, nextTs, type EventPos } from "./events";

describe("orden de los eventos", () => {
  it("comparePos ordena por ts y desempata por id", () => {
    expect(comparePos({ ts: 1, id: "z" }, { ts: 2, id: "a" })).toBeLessThan(0);
    expect(comparePos({ ts: 2, id: "a" }, { ts: 2, id: "b" })).toBeLessThan(0);
    expect(comparePos({ ts: 2, id: "b" }, { ts: 2, id: "b" })).toBe(0);
  });

  it("nextTs: un evento nuevo va siempre después del último si el reloj no ha avanzado", () => {
    const last = { ts: 100_000, id: "ffff" };
    expect(nextTs(5000, undefined)).toBe(5000);
    expect(nextTs(100_001, last)).toBe(100_001);
    expect(nextTs(100_000, last)).toBe(100_001); // mismo milisegundo
    expect(nextTs(100_000 - MAX_DRIFT_MS, last)).toBe(100_001); // reloj atrasado dentro del margen
    expect(nextTs(100_000 - MAX_DRIFT_MS - 1, last)).toBe(100_000 - MAX_DRIFT_MS - 1); // muy atrasado: se recalculará todo
  });

  it("una ráfaga de eventos en el mismo milisegundo queda en el orden en que se hicieron", () => {
    let last: EventPos | undefined;
    const out: { ts: number; id: string; n: number }[] = [];
    for (let n = 0; n < 50; n++) {
      const e = { ts: nextTs(7000, last), id: Math.random().toString(36).slice(2), n };
      out.push(e);
      last = e;
    }
    expect([...out].sort(comparePos).map((e) => e.n)).toEqual(out.map((e) => e.n));
  });
});

describe("reloj lógico híbrido entre equipos", () => {
  /** Un equipo: su reloj (desfasado `skew` ms) y el último evento que ha visto, suyo o recibido. */
  const device = (name: string, skew: number) => {
    let last: EventPos | undefined;
    let n = 0;
    return {
      emit(real: number) {
        const e = { ts: nextTs(real + skew, last), id: `${name}${n++}` };
        last = e;
        return e;
      },
      receive(e: EventPos) {
        if (!last || comparePos(e, last) > 0) last = e;
      },
    };
  };

  it("lo que un equipo hace después de ver un evento va detrás de él, aunque su reloj vaya atrasado", () => {
    const a = device("a", 0);
    const b = device("b", -30_000); // B va 30 s atrasado
    const ea = a.emit(1_000_000);
    b.receive(ea);
    const eb = b.emit(1_000_500); // medio segundo después en tiempo real
    expect(comparePos(eb, ea)).toBeGreaterThan(0);
    // Sin seguir a A, con su propio reloj, B habría quedado 29,5 s antes.
    expect(1_000_500 - 30_000).toBeLessThan(ea.ts);
  });

  it("no sigue a un reloj que va más de MAX_DRIFT_MS por delante", () => {
    const a = device("a", 3_600_000); // A adelantado una hora
    const b = device("b", 0);
    const ea = a.emit(1_000_000);
    b.receive(ea);
    expect(b.emit(1_000_000).ts).toBe(1_000_000);
  });

  it("los ts de un equipo nunca retroceden, aunque su reloj lo haga un poco", () => {
    const a = device("a", 0);
    const ts = [1000, 1000, 999, 2000, 1500, 1501, 3000].map((t) => a.emit(t).ts);
    for (let i = 1; i < ts.length; i++) expect(ts[i]).toBeGreaterThan(ts[i - 1]);
  });
});

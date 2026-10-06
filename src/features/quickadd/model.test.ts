import { describe, expect, it } from "vitest";
import { parseQuick } from "./model";

// Lunes 5 de octubre de 2026 a las 18:00, hora local (Europe/Madrid en los tests).
const NOW = new Date(2026, 9, 5, 18).getTime();
const day = (m: number, d: number, y = 2026) => new Date(y, m - 1, d).getTime();

describe("parseQuick", () => {
  it("lo que no es una marca es el título", () => {
    const q = parseQuick("  Comprar pan  ", NOW);
    expect(q).toMatchObject({ title: "Comprar pan", category: "request", target: 1 });
    expect(q.dueAt).toBeUndefined();
  });

  it("fechas: hoy, mañana, pasado mañana, días de la semana y día/mes", () => {
    expect(parseQuick("Llamar hoy", NOW).dueAt).toBe(day(10, 5));
    expect(parseQuick("Llamar mañana", NOW)).toMatchObject({ title: "Llamar", dueAt: day(10, 6) });
    expect(parseQuick("Llamar manana", NOW).dueAt).toBe(day(10, 6));
    expect(parseQuick("Llamar pasado mañana", NOW)).toMatchObject({ title: "Llamar", dueAt: day(10, 7) });
    // El próximo, sin contar hoy: hoy es lunes.
    expect(parseQuick("Gimnasio lunes", NOW).dueAt).toBe(day(10, 12));
    expect(parseQuick("Gimnasio Miércoles", NOW).dueAt).toBe(day(10, 7));
    expect(parseQuick("Pagar 12/10", NOW).dueAt).toBe(day(10, 12));
    // Ya pasó este año: el siguiente.
    expect(parseQuick("Pagar 1/3", NOW).dueAt).toBe(day(3, 1, 2027));
    expect(parseQuick("Pagar 31/2", NOW).title).toBe("Pagar 31/2");
    expect(parseQuick("Pagar 31/2", NOW).dueAt).toBeUndefined();
    expect(parseQuick("Pagar 3/1/27", NOW).dueAt).toBe(day(1, 3, 2027));
  });

  it("fechas en japonés, también con el espacio japonés", () => {
    expect(parseQuick("牛乳を買う　明日", NOW)).toMatchObject({ title: "牛乳を買う", dueAt: day(10, 6) });
    expect(parseQuick("ジム 水曜日", NOW).dueAt).toBe(day(10, 7));
    expect(parseQuick("明後日 提出", NOW)).toMatchObject({ title: "提出", dueAt: day(10, 7) });
  });

  it("área, cliente, élite y objetivo", () => {
    const q = parseQuick("Leer páginas #Estudio_y_ocio @Biblioteca x30 !", NOW);
    expect(q).toMatchObject({ title: "Leer páginas", area: "Estudio y ocio", client: "Biblioteca", category: "elite", target: 30 });
    expect(q.tokens.map((t) => t.kind)).toEqual(["area", "client", "target", "elite"]);
    expect(parseQuick("Flexiones ×500", NOW).target).toBe(99);
    expect(parseQuick("Llamar al banco!", NOW)).toMatchObject({ title: "Llamar al banco!", category: "elite" });
  });

  it("si solo hay marcas, el título queda vacío", () => {
    expect(parseQuick("mañana #Hogar", NOW).title).toBe("");
  });
});

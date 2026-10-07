import { describe, expect, it } from "vitest";
import { project } from "../../domain/projection";
import type { EventBody } from "../../domain/events";
import { characterDef, questDef, randomStream, withMeta } from "../../test/streams";
import { nextWeekStart } from "../merchant/model";
import { activeQuests, characterBlobIds, characterOfDay, dayNumber, daypart, daysUntil, rotationOrder, shownCharacter } from "./model";

describe("saludo según la hora", () => {
  it("mañana de 6 a 13, tarde hasta las 20, noche hasta medianoche y madrugada", () => {
    const parts = Array.from({ length: 24 }, (_, h) => daypart(h));
    expect(parts.slice(0, 6)).toEqual(Array(6).fill("night"));
    expect(parts.slice(6, 13)).toEqual(Array(7).fill("morning"));
    expect(parts.slice(13, 20)).toEqual(Array(7).fill("afternoon"));
    expect(parts.slice(20)).toEqual(Array(4).fill("evening"));
  });
});

describe("quest actual de la tarjeta grande", () => {
  const created = (id: string): EventBody => ({ type: "quest_created", quest: questDef(id) });
  const accepted = (id: string): EventBody => ({ type: "quest_accepted", questId: id });

  it("solo las que están en curso, la última aceptada primero", () => {
    const st = project(
      withMeta([
        created("a"),
        created("b"),
        created("c"),
        created("d"),
        accepted("b"),
        accepted("a"),
        accepted("d"),
        { type: "quest_abandoned", questId: "d" },
      ]),
    );
    expect(activeQuests(st.quests.values()).map((q) => q.id)).toEqual(["a", "b"]);
  });

  it("sin quests en curso, ninguna", () => {
    const st = project(withMeta([created("a")]));
    expect(activeQuests(st.quests.values())).toEqual([]);
  });
});

describe("días hasta que cambia el escaparate", () => {
  it("cuenta días de calendario y nunca baja de 1", () => {
    const now = new Date(2026, 9, 7, 12).getTime(); // miércoles
    expect(daysUntil(nextWeekStart(now), now)).toBe(5);
    expect(daysUntil(now + 1, now)).toBe(1);
    expect(daysUntil(now - 1000, now)).toBe(1);
  });

  it("la semana del cambio de hora (25 de octubre de 2026) cuenta igual", () => {
    const sat = new Date(2026, 9, 24, 12).getTime();
    expect(daysUntil(nextWeekStart(sat), sat)).toBe(2);
    const mon = new Date(2026, 9, 19, 0, 0, 1).getTime();
    expect(daysUntil(nextWeekStart(mon), mon)).toBe(7);
  });
});

describe("personajes añadidos (eventos)", () => {
  const added = (id: string, extra = {}): EventBody => ({ type: "character_added", character: characterDef(id, extra) });

  it("se añaden una vez, se quitan y un añadido repetido no los resucita", () => {
    const st = project(withMeta([added("a"), added("a", { name: "Otro" }), added("b"), { type: "character_removed", characterId: "a" }, added("a")]));
    expect([...st.characters.keys()]).toEqual(["b"]);
  });

  it("ignora los de serie, los que no traen imagen y quitar uno que no existe", () => {
    const st = project(
      withMeta([
        added("builtin:kazuma"),
        added("x", { art: { blobId: "", mime: "image/webp", size: 0 } }),
        { type: "character_removed", characterId: "nadie" },
        added("y", { name: "   " }),
      ]),
    );
    expect([...st.characters.keys()]).toEqual(["y"]);
    expect(st.characters.get("y")?.name).toBe("?");
  });

  it("no tocan al jugador y sus imágenes cuentan como usadas", () => {
    const st = project(withMeta([added("a"), added("b")]));
    expect(st.player.xp).toBe(0);
    expect(st.player.gold).toBe(0);
    expect([...characterBlobIds(st.characters.values())]).toEqual(["blob-a", "blob-b"]);
  });

  it("los historiales aleatorios los ejercitan", () => {
    const ev = randomStream("personajes", 600);
    expect(ev.some((e) => e.type === "character_added")).toBe(true);
    expect(ev.some((e) => e.type === "character_removed")).toBe(true);
  });
});

describe("rotación diaria", () => {
  const ids = ["kazuma", "megumin", "aqua", "darkness", "wiz"];

  it("en cada vuelta salen todos, una vez cada uno, y el orden cambia de una vuelta a otra", () => {
    const orders = new Set<string>();
    for (let cycle = 0; cycle < 40; cycle++) {
      const days = Array.from({ length: ids.length }, (_, i) => characterOfDay(ids, cycle * ids.length + i));
      expect([...days].sort()).toEqual([...ids].sort());
      orders.add(days.join());
    }
    expect(orders.size).toBeGreaterThan(10);
  });

  it("nunca repite dos días seguidos, tampoco al pasar de una vuelta a la siguiente", () => {
    for (const list of [ids, ids.slice(0, 3), ids.slice(0, 2)])
      for (let day = 1; day < 2000; day++) expect(characterOfDay(list, day)).not.toBe(characterOfDay(list, day - 1));
  });

  it("es el mismo en todos los equipos: no depende del orden de la lista", () => {
    for (let day = 0; day < 100; day++) expect(characterOfDay([...ids].reverse(), day)).toBe(characterOfDay(ids, day));
    expect(rotationOrder(ids, 7)).toEqual(rotationOrder([...ids].reverse(), 7));
  });

  it("con uno solo, siempre ese; sin ninguno, nada", () => {
    expect(characterOfDay(["kazuma"], 12345)).toBe("kazuma");
    expect(characterOfDay([], 3)).toBeUndefined();
  });

  it("cambia a medianoche (hora local), también el día del cambio de hora", () => {
    expect(dayNumber(new Date(2026, 9, 25, 23, 59).getTime())).toBe(dayNumber(new Date(2026, 9, 25, 0, 0).getTime()));
    expect(dayNumber(new Date(2026, 9, 26, 0, 0).getTime()) - dayNumber(new Date(2026, 9, 25, 0, 0).getTime())).toBe(1);
    expect(dayNumber(new Date(2026, 2, 30, 0, 0).getTime()) - dayNumber(new Date(2026, 2, 29, 0, 0).getTime())).toBe(1);
  });
});

describe("elegir uno para hoy", () => {
  const ids = ["kazuma", "megumin", "aqua", "darkness"];
  const now = new Date(2026, 9, 7, 12).getTime();
  const today = dayNumber(now);

  it("se enseña el elegido solo hoy; mañana sigue la rotación como si no se hubiera elegido", () => {
    const rotation = characterOfDay(ids, today)!;
    const other = ids.find((id) => id !== rotation)!;
    expect(shownCharacter(ids, now, { day: today, id: other })).toBe(other);
    const tomorrow = now + 86_400_000;
    expect(shownCharacter(ids, tomorrow, { day: today, id: other })).toBe(characterOfDay(ids, today + 1));
  });

  it("si el elegido ya no existe (se quitó), vuelve a la rotación", () => {
    expect(shownCharacter(ids, now, { day: today, id: "quitado" })).toBe(characterOfDay(ids, today));
  });
});

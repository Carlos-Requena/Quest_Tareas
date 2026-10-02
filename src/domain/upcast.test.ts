import { describe, expect, it } from "vitest";
import { EVENT_VERSION, type GameEvent } from "./events";
import { isFromFuture, upcastEvent, UPCASTERS, versionOf } from "./upcast";
import { applyEvent, newProjectionAcc, project } from "./projection";
import { canonical } from "../features/snapshot/model";
import { questDef, randomStream, T0, withMeta } from "../test/streams";

describe("versión de los eventos", () => {
  it("hay un paso de conversión por cada versión", () => {
    expect(UPCASTERS).toHaveLength(EVENT_VERSION);
  });

  it("un evento sin `v` es de la versión 0 y se lee en la actual sin tocar el original", () => {
    const [old] = withMeta([{ type: "quest_accepted", questId: "q" }]);
    expect(versionOf(old)).toBe(0);
    const up = upcastEvent(old);
    expect(up.v).toBe(EVENT_VERSION);
    expect(old.v).toBeUndefined();
    expect({ ...up, v: undefined }).toEqual({ ...old, v: undefined });
  });

  it("un evento de la versión actual no se copia", () => {
    const e = { ...withMeta([{ type: "quest_accepted", questId: "q" }])[0], v: EVENT_VERSION } as GameEvent;
    expect(upcastEvent(e)).toBe(e);
  });

  it("los eventos sin versión y los de la versión actual dan el mismo estado", () => {
    const ev = randomStream("versiones", 400).filter((e) => !isFromFuture(e));
    const withV = ev.map((e) => ({ ...e, v: EVENT_VERSION }));
    const without = ev.map(({ v: _v, ...e }) => e as GameEvent);
    expect(canonical(project(withV))).toBe(canonical(project(without)));
  });

  it("la proyección ignora los eventos de una versión futura de la app", () => {
    const [created] = withMeta([{ type: "quest_created", quest: questDef("q") }]);
    const future = { ...created, id: "x", ts: T0 + 1, v: EVENT_VERSION + 1, quest: questDef("nueva") } as GameEvent;
    expect(isFromFuture(future)).toBe(true);
    const acc = newProjectionAcc();
    applyEvent(acc, created);
    applyEvent(acc, future);
    expect([...acc.quests.keys()]).toEqual(["q"]);
    // Tampoco abre la crónica: es como si no estuviera.
    expect(canonical(project([future]))).toBe(canonical(project([])));
  });
});

import { describe, expect, it } from "vitest";
import { project } from "../../domain/projection";
import type { EventBody, GameEvent } from "../../domain/events";
import { at, MIN, questDef, randomStream, T0 } from "../../test/streams";
import { applyAll, canonical, emptyProjected } from "../snapshot/model";
import { finishProjection } from "../../domain/projection";
import { hasUndo, undoneIn, UNDO_WINDOW_MS } from "./model";

const create: EventBody = { type: "quest_created", quest: questDef("q") };
const undo = (eventId: string): EventBody => ({ type: "event_undone", eventId });

describe("deshacer", () => {
  it("la proyección salta el evento deshecho como si no hubiera pasado", () => {
    const c = at(T0, create);
    const del = at(T0 + MIN, { type: "quest_deleted", questId: "q" });
    const st = project([c, del, at(T0 + 2 * MIN, undo(del.id))]);
    expect(st.quests.has("q")).toBe(true);
    // Sin el deshacer, la quest no está.
    expect(project([c, del]).quests.has("q")).toBe(false);
  });

  it("deshacer abandonar devuelve la quest en curso con su progreso", () => {
    const evs = [
      at(T0, create),
      at(T0 + 1, { type: "quest_accepted", questId: "q" }),
      at(T0 + 2, { type: "progress_added", questId: "q", conditionId: "q-c", amount: 1 }),
    ];
    const ab = at(T0 + 3, { type: "quest_abandoned", questId: "q" });
    const q = project([...evs, ab, at(T0 + 4, undo(ab.id))]).quests.get("q")!;
    expect(q.status).toBe("active");
    expect(q.progress["q-c"]).toBe(1);
  });

  it("no deshace lo que no se puede (completar: el cofre se volvería a tirar) ni pasada la ventana", () => {
    const c = at(T0, create);
    const acc = at(T0 + 1, { type: "quest_accepted", questId: "q" });
    const done = at(T0 + 2, { type: "quest_completed", questId: "q", reward: { xp: 10, gold: 1 } });
    expect(project([c, acc, done, at(T0 + 3, undo(done.id))]).player.xp).toBe(10);
    expect(undoneIn([c, at(T0 + UNDO_WINDOW_MS, undo(c.id))]).has(c.id)).toBe(true);
    expect(undoneIn([c, at(T0 + UNDO_WINDOW_MS + 1, undo(c.id))]).has(c.id)).toBe(false);
    expect(undoneIn([c, at(T0 + 1, undo("no-existe"))]).size).toBe(0);
  });

  it("applyAll da lo mismo que project() con deshacer, y hasUndo avisa de que hay que reproducirlo todo", () => {
    const evs = randomStream("deshacer", 600);
    expect(hasUndo(evs)).toBe(true);
    const full = applyAll(emptyProjected(), evs);
    expect(canonical(finishProjection(full.acc))).toBe(canonical(project(evs)));
  });

  it("un deshacer de otro equipo cuenta igual", () => {
    const c = at(T0, create, "a");
    const del: GameEvent = at(T0 + 1, { type: "quest_deleted", questId: "q" }, "a");
    expect(project([c, del, at(T0 + 2, undo(del.id), "b")]).quests.has("q")).toBe(true);
  });
});

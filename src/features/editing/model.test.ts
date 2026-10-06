import { describe, expect, it } from "vitest";
import { project } from "../../domain/projection";
import type { EventBody } from "../../domain/events";
import { questDef, T0, withMeta } from "../../test/streams";
import { diffQuest, type QuestPatch } from "./model";
import { questReward } from "../rewards/model";

const create = (id: string, extra: Parameters<typeof questDef>[1] = {}): EventBody => ({ type: "quest_created", quest: questDef(id, extra) });
const update = (questId: string, patch: QuestPatch): EventBody => ({ type: "quest_updated", questId, patch });
const accept = (questId: string): EventBody => ({ type: "quest_accepted", questId });
const complete = (questId: string): EventBody => ({ type: "quest_completed", questId, reward: { xp: 10, gold: 1 } });

describe("quest_updated", () => {
  it("cambia los textos, la fecha y los contactos; lo que no viene se queda", () => {
    const st = project(
      withMeta([
        create("q", { description: "antes", area: "Salud" }),
        update("q", { title: "  Nueva  ", dueAt: T0 + 86_400_000, contacts: [{ id: "k", kind: "phone", name: "", value: "600 000 000" }] }),
      ]),
    );
    const q = st.quests.get("q")!;
    expect(q.title).toBe("Nueva");
    expect(q.description).toBe("antes");
    expect(q.area).toBe("Salud");
    expect(q.dueAt).toBe(T0 + 86_400_000);
    expect(q.contacts).toHaveLength(1);
  });

  it("null quita la fecha límite y los requisitos", () => {
    const st = project(withMeta([create("r"), create("q", { dueAt: T0, requires: ["r"] }), update("q", { dueAt: null, requires: null })]));
    expect(st.quests.get("q")?.dueAt).toBeUndefined();
    expect(st.quests.get("q")?.requires).toBeUndefined();
  });

  it("un título vacío no borra el que había", () => {
    expect(project(withMeta([create("q"), update("q", { title: "   " })])).quests.get("q")?.title).toBe("Quest q");
  });

  it("recalcula la recompensa con los objetivos y la categoría nuevos", () => {
    const conditions = [{ id: "n", kind: "count" as const, label: "z", target: 9 }];
    const q = project(withMeta([create("q"), update("q", { category: "elite", conditions })])).quests.get("q")!;
    expect(q.category).toBe("elite");
    expect(q.conditions).toEqual(conditions);
    expect(q.reward).toEqual(questReward({ category: "elite", conditions }));
  });

  it("en curso no cambian los objetivos, la categoría ni la repetición, pero sí el título", () => {
    const conditions = [{ id: "n", kind: "count" as const, label: "z", target: 9 }];
    const q = project(
      withMeta([create("q"), accept("q"), { type: "progress_added", questId: "q", conditionId: "q-c", amount: 1 }, update("q", { title: "T", category: "elite", conditions, repeatDays: [1] })]),
    ).quests.get("q")!;
    expect(q.title).toBe("T");
    expect(q.category).toBe("request");
    expect(q.conditions[0].id).toBe("q-c");
    expect(q.repeatDays).toBeUndefined();
    expect(q.progress["q-c"]).toBe(1);
  });

  it("una quest terminada ya no se edita", () => {
    expect(project(withMeta([create("q"), accept("q"), complete("q"), update("q", { title: "T" })])).quests.get("q")?.title).toBe("Quest q");
  });

  it("los objetivos mal formados se ignoran y la lista vacía no deja la quest sin objetivos", () => {
    const st = project(withMeta([create("q"), update("q", { conditions: [] }), update("q", { conditions: [{ id: "x", kind: "count", label: "a", target: 0 }] })]));
    expect(st.quests.get("q")?.conditions[0].id).toBe("q-c");
  });

  it("no deja pedir de requisito una quest que ya depende de esta (sin círculos)", () => {
    const st = project(withMeta([create("a"), create("b", { requires: ["a"] }), create("c", { requires: ["b"] }), update("a", { requires: ["c", "b"] })]));
    expect(st.quests.get("a")?.requires).toBeUndefined();
  });

  it("una quest que pasa a repetirse pierde la fecha límite", () => {
    const q = project(withMeta([create("q", { dueAt: T0 }), update("q", { repeatDays: [1, 4] })])).quests.get("q")!;
    expect(q.repeatDays).toEqual([1, 4]);
    expect(q.dueAt).toBeUndefined();
  });
});

describe("diffQuest", () => {
  it("solo lo que cambia, con null para lo que se quita", () => {
    const q = questDef("q", { dueAt: T0, area: "Salud" });
    expect(diffQuest(q, { ...q })).toBeUndefined();
    expect(diffQuest(q, { ...q, title: "T", dueAt: undefined })).toEqual({ title: "T", dueAt: null });
    expect(diffQuest(q, { ...q, reward: { ...q.reward, itemId: "i" } })).toEqual({ itemId: "i" });
  });
});

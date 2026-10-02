import { describe, expect, it } from "vitest";
import { conditionProgress, conditionsMet, countConditionsMet, project } from "../../domain/projection";
import { questDef, withMeta, T0 } from "../../test/streams";
import type { EventBody } from "../../domain/events";
import { applyCheck, checklistProgress, cleanChecklist, nextUnchecked, type ChecklistConditionDef } from "./model";

const list: ChecklistConditionDef = {
  id: "l",
  kind: "checklist",
  label: "Maleta",
  target: 3,
  items: [
    { id: "a", text: "Cepillo" },
    { id: "b", text: "Cargador" },
    { id: "c", text: "Pasaporte" },
  ],
};

describe("modelo", () => {
  it("limpia las casillas: sin vacías ni repetidas, y el objetivo es cuántas quedan", () => {
    const c = cleanChecklist({ ...list, target: 99, items: [...list.items, { id: "a", text: "otra" }, { id: "d", text: "   " }, { id: "e", text: "  Gafas " }] });
    expect(c.items.map((i) => i.id)).toEqual(["a", "b", "c", "e"]);
    expect(c.items[3].text).toBe("Gafas");
    expect(c.target).toBe(4);
    expect(cleanChecklist({ ...list, items: undefined as never }).target).toBe(0);
  });

  it("marcar es un valor por casilla: marcar dos veces cuenta una", () => {
    let ch = applyCheck({}, list, "a", true);
    ch = applyCheck(ch, list, "a", true);
    ch = applyCheck(ch, list, "zzz", true);
    expect(checklistProgress(ch, list)).toBe(1);
    expect(nextUnchecked(ch, list)?.id).toBe("b");
    ch = applyCheck(ch, list, "a", false);
    expect(checklistProgress(ch, list)).toBe(0);
  });
});

describe("en la proyección", () => {
  const created: EventBody = { type: "quest_created", quest: questDef("q", { conditions: [list] }) };
  const check = (itemId: string, done = true): EventBody => ({ type: "checklist_checked", questId: "q", conditionId: "l", itemId, done });

  it("solo se marca con la quest en curso, y aceptar o abandonar la vacía", () => {
    const st = project(withMeta([created, check("a"), { type: "quest_accepted", questId: "q" }, check("a"), check("b")]));
    const q = st.quests.get("q")!;
    expect(conditionProgress(q, q.conditions[0], T0)).toBe(2);
    expect(countConditionsMet(q)).toBe(false);
    const st2 = project(withMeta([created, { type: "quest_accepted", questId: "q" }, check("a"), { type: "quest_abandoned", questId: "q" }, { type: "quest_accepted", questId: "q" }]));
    expect(st2.quests.get("q")!.checked).toEqual({});
  });

  it("con todas marcadas se puede reportar; +1 de contador no la cuenta", () => {
    const st = project(
      withMeta([
        created,
        { type: "quest_accepted", questId: "q" },
        { type: "progress_added", questId: "q", conditionId: "l", amount: 1 },
        check("a"),
        check("b"),
        check("c"),
      ]),
    );
    const q = st.quests.get("q")!;
    expect(q.progress).toEqual({});
    expect(conditionsMet(q, T0)).toBe(true);
  });
});

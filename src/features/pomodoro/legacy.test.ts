import { describe, expect, it } from "vitest";
import { legacyConditionId, upcastQuestDef } from "./legacy";
import { conditionsMet, project } from "../../domain/projection";
import type { QuestDef } from "../../domain/types";
import { at, MIN, questDef, T0 } from "../../test/streams";

// Quest de la primera versión: el pomodoro era un objeto de la quest, no una condición.
const v1 = { ...questDef("old", { conditions: [] }), pomodoroConfig: { focusMinutes: 25, breakMinutes: 5 } } as QuestDef;

describe("pomodoro v1 → v2 (upcasting)", () => {
  it("convierte pomodoroConfig en una condición de 1 ronda con id estable", () => {
    const def = upcastQuestDef(v1);
    expect(def).not.toHaveProperty("pomodoroConfig");
    expect(def.conditions).toEqual([{ id: "old:pomodoro", kind: "pomodoro", label: "", target: 1, focusMinutes: 25, breakMinutes: 5 }]);
    expect(legacyConditionId("old")).toBe("old:pomodoro");
  });

  it("deja igual una quest que ya está en el formato actual", () => {
    const v2 = questDef("new");
    expect(upcastQuestDef(v2)).toBe(v2);
  });

  it("los eventos antiguos sin conditionId mueven el pomodoro convertido y la quest se completa", () => {
    const st = project([
      at(T0, { type: "quest_created", quest: v1 }),
      at(T0 + MIN, { type: "quest_accepted", questId: "old" }),
      at(T0 + 2 * MIN, { type: "pomodoro_started", questId: "old" }),
    ]);
    const q = st.quests.get("old")!;
    expect(q.pomodoros["old:pomodoro"].status).toBe("running");
    expect(conditionsMet(q, T0 + 10 * MIN)).toBe(false);
    expect(conditionsMet(q, T0 + 27 * MIN)).toBe(true);
  });
});

// @vitest-environment happy-dom
// Deslizar una tarjeta hacia la derecha hace su acción principal solo cuando se puede hacer ya.
import { describe, expect, it, vi } from "vitest";
import { project } from "../../domain/projection";
import { questDef, T0, withMeta } from "../../test/streams";
import { swipeAction } from "./actions";

vi.mock("../../lib/sfx", async () => (await import("../../test/sfxMock")).sfxMock());

const created = { type: "quest_created", quest: questDef("q") } as const;
const accept = { type: "quest_accepted", questId: "q" } as const;
const plus = { type: "progress_added", questId: "q", conditionId: "q-c", amount: 1 } as const;
const quest = (events: Parameters<typeof withMeta>[0]) => project(withMeta(events)).quests.get("q")!;

describe("swipeAction", () => {
  it("una disponible y sin requisitos pendientes se acepta", () => {
    expect(swipeAction(quest([created]), "available", false, T0)).toBe("accept");
  });

  it("una bloqueada por otra quest no se desliza", () => {
    expect(swipeAction(quest([created]), "available", true, T0)).toBeUndefined();
  });

  it("una en curso con los objetivos a medias no se desliza", () => {
    expect(swipeAction(quest([created, accept, plus]), "active", false, T0)).toBeUndefined();
  });

  it("una en curso con los objetivos cumplidos se reporta", () => {
    expect(swipeAction(quest([created, accept, plus, plus]), "active", false, T0)).toBe("report");
  });

  it("una en espera (cooldown) no se desliza", () => {
    expect(swipeAction(quest([created]), "cooldown", false, T0)).toBeUndefined();
  });
});

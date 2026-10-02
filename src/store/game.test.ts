// @vitest-environment happy-dom
// El store tal cual lo usa la app: init, dispatch y acciones, con el EventStore y el
// snapshot de verdad sobre el localStorage de un navegador simulado. Solo el sonido es falso.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { compareEvents, type EventBody, type GameEvent } from "../domain/events";
import { project } from "../domain/projection";
import { canonical, decodeSnapshot, encodeSnapshot } from "../features/snapshot/model";
import { MIN, questDef, T0, temporalDef } from "../test/streams";

vi.mock("../lib/sfx", async () => (await import("../test/sfxMock")).sfxMock());

/** Arranca la app desde cero (módulos nuevos, mismo localStorage), como al abrirla otra vez. */
async function boot() {
  vi.resetModules();
  const { useGame } = await import("./game");
  const actions = await import("./actions");
  const temporal = await import("../features/temporal/actions");
  const items = await import("../features/items/actions");
  const pomodoro = await import("../features/pomodoro/actions");
  await useGame.getState().init();
  const g = () => useGame.getState();
  return { useGame, g, actions, temporal, items, pomodoro };
}

const stored = (): GameEvent[] => JSON.parse(localStorage.getItem("quests.events") ?? "[]").sort(compareEvents);
const snapshot = () => decodeSnapshot(localStorage.getItem("quests.snapshot"));
/** Lo que vale de verdad: reproducir todos los eventos guardados. */
const truth = () => canonical(project(stored()));
type Booted = Awaited<ReturnType<typeof boot>>;
const consistent = (b: Booted) => expect(canonical(b.g().state)).toBe(truth());
const quest = (b: Booted, title: string) => [...b.g().state.quests.values()].find((q) => q.title === title)!;
const lastEvent = () => stored()[stored().length - 1];

async function addQuest(b: Booted, id: string, extra = {}) {
  await b.g().dispatch({ type: "quest_created", quest: questDef(id, { createdAt: Date.now(), ...extra }) });
  return b.g().state.quests.get(id)!;
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("quests.lang", "es");
});
afterEach(() => vi.restoreAllMocks());

describe("arranque", () => {
  it("el primer arranque crea las quests y objetos de ejemplo", async () => {
    const b = await boot();
    expect(b.g().ready).toBe(true);
    expect(b.g().error).toBeUndefined();
    expect(b.g().state.quests.size).toBe(5);
    expect(b.g().state.items.size).toBe(10);
    expect(stored()).toHaveLength(15);
    consistent(b);
    // Con menos de 100 eventos aún no hay snapshot.
    expect(snapshot()).toBeUndefined();
  });

  it("init dos veces a la vez (modo estricto de React) no duplica los datos de ejemplo", async () => {
    vi.resetModules();
    const { useGame } = await import("./game");
    await Promise.all([useGame.getState().init(), useGame.getState().init()]);
    expect(stored()).toHaveLength(15);
  });

  it("al volver a abrir, el estado es el mismo", async () => {
    const a = await boot();
    await a.actions.acceptQuest(quest(a, a.g().state.quests.values().next().value!.title).id);
    const before = canonical(a.g().state);
    const b = await boot();
    expect(canonical(b.g().state)).toBe(before);
  });
});

describe("dispatch incremental", () => {
  it("tras muchas acciones, el estado en memoria coincide con reproducir todo", async () => {
    const b = await boot();
    for (let i = 0; i < 6; i++) await addQuest(b, `q${i}`, { conditions: [{ id: `q${i}-c`, kind: "count", label: "x", target: 2 }] });
    for (let i = 0; i < 4; i++) {
      await b.actions.acceptQuest(`q${i}`);
      await b.actions.addProgress(`q${i}`, `q${i}-c`, 1);
      consistent(b);
    }
    await b.actions.bumpNext("q0");
    await b.actions.reportQuest("q0");
    await b.actions.abandonQuest("q1");
    consistent(b);
    expect(b.g().state.quests.get("q0")?.status).toBe("done");
    expect(b.g().state.quests.get("q1")?.status).toBe("available");
  });

  it("cada 100 eventos guarda un snapshot, y al volver a abrir lo usa", async () => {
    const b = await boot();
    await addQuest(b, "q", { conditions: [{ id: "c", kind: "count", label: "x", target: 999 }] });
    await b.actions.acceptQuest("q");
    for (let i = 0; i < 85; i++) await b.actions.addProgress("q", "c", 1);
    // 15 de ejemplo + 1 + 1 + 85 = 102 → snapshot al llegar a 100.
    await vi.waitFor(() => expect(snapshot()?.count).toBe(100));
    const savedAt = snapshot()!.savedAt;

    const err = vi.spyOn(console, "error");
    const again = await boot();
    consistent(again);
    expect(again.g().projected.count).toBe(102);
    expect(again.g().state.quests.get("q")?.progress).toEqual({ c: 85 });
    // Lo usó (no lo rehízo) y la comprobación de desarrollo no encontró diferencias.
    expect(snapshot()!.savedAt).toBe(savedAt);
    expect(err).not.toHaveBeenCalled();
  });

  it("un snapshot falseado se detecta al arrancar en desarrollo y se corrige", async () => {
    const b = await boot();
    await addQuest(b, "q", { conditions: [{ id: "c", kind: "count", label: "x", target: 999 }] });
    await b.actions.acceptQuest("q");
    for (let i = 0; i < 85; i++) await b.actions.addProgress("q", "c", 1);
    await vi.waitFor(() => expect(snapshot()?.count).toBe(100));
    const s = snapshot()!;
    s.acc.gold += 1000;
    localStorage.setItem("quests.snapshot", encodeSnapshot(s));

    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const again = await boot();
    expect(err).toHaveBeenCalledOnce();
    consistent(again);
    await vi.waitFor(() => expect(snapshot()!.acc.gold).toBe(again.g().state.player.gold));
  });

  it("con el reloj atrasado, el evento cae en medio del historial y se recalcula todo", async () => {
    const b = await boot();
    await addQuest(b, "q");
    await b.actions.acceptQuest("q");
    vi.spyOn(Date, "now").mockReturnValue(T0); // enero de 2026, antes de todo lo demás
    await b.actions.abandonQuest("q");
    vi.mocked(Date.now).mockRestore();
    expect(stored()[0].type).toBe("quest_abandoned");
    consistent(b);
    // El abandono fechado antes de aceptarla se ignora, como haría cualquier dispositivo.
    expect(b.g().state.quests.get("q")?.status).toBe("active");
  });

  it("tras fusionar eventos de un equipo con el reloj adelantado, lo nuevo va detrás de ellos (reloj híbrido)", async () => {
    const b = await boot();
    await addQuest(b, "q");
    // Otro equipo, 30 s adelantado, acepta la quest; llega al fusionar.
    const remote = { type: "quest_accepted", questId: "q", id: "remoto", deviceId: "otro", ts: Date.now() + 30_000, v: 1 } as GameEvent;
    expect(await b.g().store!.merge([remote])).toBe(1);
    await b.g().rebuild();
    expect(b.g().state.quests.get("q")?.status).toBe("active");
    // Abandonarla aquí justo después: con el reloj de este equipo quedaría antes y se ignoraría.
    await b.actions.abandonQuest("q");
    expect(lastEvent().type).toBe("quest_abandoned");
    expect(lastEvent().ts).toBeGreaterThan(remote.ts);
    expect(lastEvent().v).toBe(1);
    expect(b.g().state.quests.get("q")?.status).toBe("available");
    consistent(b);
  });

  it("un dispatch durante un recálculo espera a que termine y no se pierde", async () => {
    const b = await boot();
    await addQuest(b, "q", { conditions: [{ id: "c", kind: "count", label: "x", target: 9 }] });
    await b.actions.acceptQuest("q");
    const rebuilding = b.g().rebuild();
    const p = b.g().dispatch({ type: "progress_added", questId: "q", conditionId: "c", amount: 1 });
    await Promise.all([rebuilding, p]);
    expect(b.g().state.quests.get("q")?.progress).toEqual({ c: 1 });
    consistent(b);
  });
});

describe("acciones de quests", () => {
  it("no hay límite de quests en curso: se aceptan las 12", async () => {
    const b = await boot();
    for (let i = 0; i < 12; i++) await addQuest(b, `q${i}`);
    for (let i = 0; i < 12; i++) await b.actions.acceptQuest(`q${i}`);
    const active = [...b.g().state.quests.values()].filter((q) => q.status === "active");
    expect(active).toHaveLength(12);
    consistent(b);
  });

  it("no deja aceptar una quest con requisitos pendientes ni emite el evento", async () => {
    const b = await boot();
    await addQuest(b, "a");
    await addQuest(b, "b", { requires: ["a"] });
    const n = stored().length;
    await b.actions.acceptQuest("b");
    expect(stored()).toHaveLength(n);
    expect(b.g().state.quests.get("b")?.status).toBe("available");
  });

  it("el progreso no se sale del objetivo y no se puede reportar sin cumplirlo", async () => {
    const b = await boot();
    await addQuest(b, "q", { conditions: [{ id: "c", kind: "count", label: "x", target: 2 }] });
    await b.actions.acceptQuest("q");
    const n = stored().length;
    await b.actions.addProgress("q", "c", -1);
    await b.actions.reportQuest("q");
    expect(stored()).toHaveLength(n);
    await b.actions.addProgress("q", "c", 1);
    await b.actions.addProgress("q", "c", 1);
    await b.actions.addProgress("q", "c", 1);
    expect(b.g().state.quests.get("q")?.progress).toEqual({ c: 2 });
    expect(stored()).toHaveLength(n + 2);
  });

  it("reportar copia la recompensa, guarda el botín en el evento y prepara la pantalla de Quest Clear", async () => {
    const b = await boot();
    await addQuest(b, "q", { category: "elite", conditions: [{ id: "c", kind: "count", label: "x", target: 1 }], reward: { xp: 400, gold: 200 } });
    await b.actions.primaryAction("q");
    await b.actions.addProgress("q", "c", 1);
    vi.spyOn(Math, "random").mockReturnValue(0.3);
    await b.actions.primaryAction("q");
    const e = lastEvent();
    expect(e).toMatchObject({ type: "quest_completed", questId: "q", reward: { xp: 400, gold: 200 } });
    expect((e as Extract<GameEvent, { type: "quest_completed" }>).drops).toHaveLength(2); // élite: dos tiradas
    const clear = b.g().clear!;
    expect(clear.before.xp).toBe(0);
    expect(clear.after.xp).toBe(400);
    expect(clear.drops).toEqual((e as Extract<GameEvent, { type: "quest_completed" }>).drops);
    consistent(b);
  });

  it("reportar avisa de la quest que se desbloquea", async () => {
    const b = await boot();
    await addQuest(b, "a", { conditions: [{ id: "c", kind: "count", label: "x", target: 1 }] });
    await addQuest(b, "b", { requires: ["a"] });
    await b.actions.acceptQuest("a");
    await b.actions.addProgress("a", "c", 1);
    await b.actions.reportQuest("a");
    expect(b.g().toast?.text()).toContain("Quest b");
    await b.actions.acceptQuest("b");
    expect(b.g().state.quests.get("b")?.status).toBe("active");
  });
});

describe("acciones de encargos temporales", () => {
  const draft = (b: Booted, extra = {}) => ({ ...b.temporal.emptyDraft(), title: "Médico", ...extra });

  it("un encargo sin título no se crea", async () => {
    const b = await boot();
    const n = stored().length;
    expect(await b.temporal.createTemporal(draft(b, { title: "  " }))).toBe(false);
    expect(stored()).toHaveLength(n);
  });

  it("crea sus quests en cadena, no se cumple hasta terminarlas y entonces cobra", async () => {
    const b = await boot();
    const seeds = [
      { key: "1", title: "Pedir cita", target: 1 },
      { key: "2", title: "Llevar análisis", target: 1 },
    ];
    expect(await b.temporal.createTemporal(draft(b, { newQuests: seeds, chain: true, xp: 300, gold: 50 }))).toBe(true);
    const t = [...b.g().state.temporals.values()].find((x) => x.title === "Médico")!;
    const [q1, q2] = t.questIds.map((id) => b.g().state.quests.get(id)!);
    expect([q1.title, q2.title]).toEqual(["Pedir cita", "Llevar análisis"]);
    expect(q2.requires).toEqual([q1.id]);
    expect(q1.temporalId).toBe(t.id);

    const n = stored().length;
    await b.temporal.completeTemporal(t.id);
    expect(stored()).toHaveLength(n);
    expect(b.g().state.temporals.get(t.id)?.status).toBe("pending");

    for (const q of [q1, q2]) {
      await b.actions.acceptQuest(q.id);
      await b.actions.addProgress(q.id, q.conditions[0].id, 1);
      await b.actions.reportQuest(q.id);
    }
    const xpBefore = b.g().state.player.xp;
    await b.temporal.completeTemporal(t.id);
    expect(b.g().state.temporals.get(t.id)).toMatchObject({ status: "done", earned: { xp: 300, gold: 50 } });
    expect(b.g().state.player.xp).toBe(xpBefore + 300);
    consistent(b);
  });

  it("editar solo emite los campos que cambian y desenlaza las quests quitadas", async () => {
    const b = await boot();
    await addQuest(b, "q");
    await b.temporal.createTemporal(draft(b, { questIds: ["q"] }));
    const t = [...b.g().state.temporals.values()].find((x) => x.title === "Médico")!;
    const d = { ...b.temporal.draftOf(t, b.g().state.quests), place: "Hospital", questIds: [] };
    const n = stored().length;
    expect(await b.temporal.updateTemporal(t.id, d)).toBe(true);
    const added = stored().slice(n);
    expect(added.map((e) => e.type)).toEqual(["temporal_updated", "temporal_unlinked"]);
    expect((added[0] as Extract<GameEvent, { type: "temporal_updated" }>).patch).toEqual({ place: "Hospital" });
    expect(b.g().state.quests.get("q")?.temporalId).toBeUndefined();
    consistent(b);
  });
});

describe("acciones de objetos y pomodoro", () => {
  it("objetos: sin nombre no se crea; editar sin cambios no emite nada", async () => {
    const b = await boot();
    expect(await b.items.createItem({ ...b.items.emptyItemDraft(), name: " " })).toBeUndefined();
    const id = (await b.items.createItem({ ...b.items.emptyItemDraft(), name: "Espada", rarity: "epic" }))!;
    const n = stored().length;
    await b.items.updateItem(id, b.items.draftOf(b.g().state.items.get(id)!));
    expect(stored()).toHaveLength(n);
    await b.items.updateItem(id, { ...b.items.draftOf(b.g().state.items.get(id)!), name: "Espada rota" });
    expect(lastEvent()).toMatchObject({ type: "item_updated", patch: { name: "Espada rota" } });
    await b.items.deleteItem(id);
    expect(b.g().state.items.has(id)).toBe(false);
    consistent(b);
  });

  it("pomodoro: solo uno corriendo a la vez en toda la app", async () => {
    const b = await boot();
    const pomo = (id: string) => ({ conditions: [{ id: `${id}-p`, kind: "pomodoro" as const, label: "", target: 1, focusMinutes: 25, breakMinutes: 5 }] });
    await addQuest(b, "a", pomo("a"));
    await addQuest(b, "b", pomo("b"));
    await b.actions.acceptQuest("a");
    await b.actions.acceptQuest("b");
    await b.pomodoro.startPomodoro("a", "a-p");
    const n = stored().length;
    await b.pomodoro.startPomodoro("b", "b-p");
    expect(stored()).toHaveLength(n);
    await b.pomodoro.pausePomodoro("a", "a-p");
    await b.pomodoro.startPomodoro("b", "b-p");
    expect(b.g().state.quests.get("b")?.pomodoros["b-p"].status).toBe("running");
    consistent(b);
  });
});

describe("eventos que llegan sin pasar por las acciones", () => {
  it("dispatch acepta cualquier evento y la proyección ignora los imposibles", async () => {
    const b = await boot();
    const bodies: EventBody[] = [
      { type: "quest_completed", questId: "no-existe", reward: { xp: 9999, gold: 9999 } },
      { type: "temporal_completed", temporalId: "no-existe", reward: { xp: 9999, gold: 9999 } },
      { type: "temporal_created", temporal: temporalDef("t", { createdAt: T0 + MIN }) },
      { type: "temporal_linked", temporalId: "t", questId: "fantasma" },
    ];
    for (const body of bodies) await b.g().dispatch(body);
    expect(b.g().state.player.xp).toBe(0);
    consistent(b);
  });
});

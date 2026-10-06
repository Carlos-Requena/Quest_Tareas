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
  const agenda = await import("../features/agenda/actions");
  await useGame.getState().init();
  const g = () => useGame.getState();
  return { useGame, g, actions, temporal, items, pomodoro, agenda };
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
    // La recompensa sale de los objetivos (features/rewards), no de la que traía la quest: contador ×1 en élite (×2).
    expect(e).toMatchObject({ type: "quest_completed", questId: "q", reward: { xp: 50, gold: 900 } });
    expect((e as Extract<GameEvent, { type: "quest_completed" }>).drops).toHaveLength(2); // élite: dos tiradas
    const clear = b.g().clear!;
    expect(clear.before.xp).toBe(0);
    expect(clear.after.xp).toBe(50);
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
    expect(await b.temporal.createTemporal(draft(b, { newQuests: seeds, chain: true, accept: true }))).toBe(true);
    const t = [...b.g().state.temporals.values()].find((x) => x.title === "Médico")!;
    const [q1, q2] = t.questIds.map((id) => b.g().state.quests.get(id)!);
    expect([q1.title, q2.title]).toEqual(["Pedir cita", "Llevar análisis"]);
    expect(t.acceptedAt).toBeDefined();
    expect(q1.reserved).toBeUndefined();
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
    // 1 calavera (60 XP, 30 G × 45) + 20 % de sus dos quests (25 XP y 450 G cada una), redondeado a 5.
    expect(b.g().state.temporals.get(t.id)).toMatchObject({ status: "done", earned: { xp: 70, gold: 1530 } });
    expect(b.g().state.player.xp).toBe(xpBefore + 70);
    consistent(b);
  });

  it("sin aceptar, sus quests esperan en reserva; al aceptarlo salen y se pueden hacer; aplazar pide no tener ninguna en curso", async () => {
    const b = await boot();
    expect(await b.temporal.createTemporal(draft(b, { newQuests: [{ key: "1", title: "Repasar", target: 1 }] }))).toBe(true);
    const t = [...b.g().state.temporals.values()].find((x) => x.title === "Médico")!;
    expect(t.acceptedAt).toBeUndefined();
    const qid = t.questIds[0];
    expect(b.g().state.quests.get(qid)).toMatchObject({ reserved: true, temporalId: t.id, status: "available" });
    expect(b.g().toast?.text()).toContain("reserva");

    // En reserva: ni se acepta la quest ni se cumple el encargo (sin escribir eventos).
    const n = stored().length;
    await b.actions.acceptQuest(qid);
    await b.temporal.completeTemporal(t.id);
    expect(stored()).toHaveLength(n);
    expect(b.g().state.quests.get(qid)?.status).toBe("available");
    expect(b.g().toast?.text()).toContain("Médico");

    await b.temporal.acceptTemporal(t.id);
    expect(b.g().state.temporals.get(t.id)?.acceptedAt).toBeDefined();
    expect(b.g().state.quests.get(qid)?.reserved).toBeUndefined();
    expect(b.g().toast?.text()).toContain("1 quest");

    // Con la quest en curso no se aplaza; sin ella, sí, y vuelve a la reserva.
    await b.actions.acceptQuest(qid);
    expect(b.g().state.quests.get(qid)?.status).toBe("active");
    const m = stored().length;
    await b.temporal.postponeTemporal(t.id);
    expect(stored()).toHaveLength(m);
    await b.actions.abandonQuest(qid);
    await b.temporal.postponeTemporal(t.id);
    expect(b.g().state.temporals.get(t.id)?.acceptedAt).toBeUndefined();
    expect(b.g().state.quests.get(qid)?.reserved).toBe(true);
    consistent(b);
  });

  it("las quests completas del formulario se publican al guardar, van antes que las rápidas y suben el valor del encargo", async () => {
    const b = await boot();
    const full = questDef("full", {
      category: "elite",
      conditions: [{ id: "p", kind: "pomodoro", label: "Estudiar", target: 3, focusMinutes: 50, breakMinutes: 10 }],
      requires: undefined,
    });
    const d = draft(b, { difficulty: 3, fullQuests: [full], newQuests: [{ key: "1", title: "Imprimir", target: 4 }], chain: true });
    // 3 calaveras (200 XP, 100 G × 45) + 40 % de la élite (300 XP, 5.400 G) y de la rápida (50 XP, 900 G).
    expect(b.temporal.draftReward(d, b.g().state.quests)).toEqual({ xp: 340, gold: 7020 });
    expect(await b.temporal.createTemporal(d)).toBe(true);
    const t = [...b.g().state.temporals.values()].find((x) => x.title === "Médico")!;
    expect(t.questIds[0]).toBe("full");
    const [q1, q2] = t.questIds.map((id) => b.g().state.quests.get(id)!);
    expect(q1.reward).toMatchObject({ xp: 300, gold: 5400 });
    expect(q2.requires).toEqual(["full"]);
    expect(t.reward).toEqual({ xp: 340, gold: 7020 });
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

describe("contactos de los encargos", () => {
  it("se guardan limpios al clavarlo y quitarlos todos se guarda como lista vacía", async () => {
    const b = await boot();
    const d = { ...b.temporal.emptyDraft(), title: "Dentista", contacts: [{ id: "k", kind: "phone" as const, name: " Clínica ", value: " 600 111 222 " }, { id: "v", kind: "email" as const, name: "", value: " " }] };
    expect(await b.temporal.createTemporal(d)).toBe(true);
    const t = [...b.g().state.temporals.values()].find((x) => x.title === "Dentista")!;
    expect(t.contacts).toEqual([{ id: "k", kind: "phone", name: "Clínica", value: "600 111 222" }]);
    const n = stored().length;
    expect(await b.temporal.updateTemporal(t.id, { ...b.temporal.draftOf(t, b.g().state.quests), contacts: [] })).toBe(true);
    const patch = (stored().slice(n)[0] as Extract<GameEvent, { type: "temporal_updated" }>).patch;
    expect(patch).toEqual({ contacts: [] });
    expect(b.g().state.temporals.get(t.id)?.contacts).toEqual([]);
    consistent(b);
  });
});

describe("acciones de la agenda", () => {
  it("crea, edita con un parche mínimo, quita la repetición, salta un día y retira; sin tocar al jugador", async () => {
    const b = await boot();
    const player = b.g().state.player;
    const d = { ...b.agenda.emptyAgendaDraft("2026-10-05", 19 * 60), title: "Gimnasio", repeat: "days" as const, days: [1, 4] };
    expect(b.agenda.agendaDraftError({ ...d, end: "18:00" })).toBe("time");
    expect(await b.agenda.saveAgenda(d)).toBe(true);
    const e = [...b.g().state.agenda.values()].find((x) => x.title === "Gimnasio")!;
    expect(e).toMatchObject({ start: 1140, end: 1200, repeat: { days: [1, 4] } });

    // Solo cambia la hora de fin: el parche lleva solo eso.
    let n = stored().length;
    expect(await b.agenda.saveAgenda({ ...b.agenda.agendaDraftOf(e), end: "20:30" }, e.id)).toBe(true);
    expect((stored().slice(n)[0] as Extract<GameEvent, { type: "agenda_updated" }>).patch).toEqual({ end: 1230 });

    // Saltar un día que tiene bloque.
    await b.agenda.skipAgendaDay(e.id, "2026-10-08", "8 oct");
    expect(b.g().state.agenda.get(e.id)?.skipped).toEqual(["2026-10-08"]);

    // Quitar la repetición no se pierde en el JSON (va como días vacíos).
    n = stored().length;
    await b.agenda.saveAgenda({ ...b.agenda.agendaDraftOf(b.g().state.agenda.get(e.id)!), repeat: "none" }, e.id);
    expect((stored().slice(n)[0] as Extract<GameEvent, { type: "agenda_updated" }>).patch).toEqual({ repeat: { days: [] } });
    expect(b.g().state.agenda.get(e.id)?.repeat).toBeUndefined();

    // Un bloque suelto: «quitar este día» lo retira entero.
    await b.agenda.skipAgendaDay(e.id, "2026-10-05", "5 oct");
    expect(b.g().state.agenda.has(e.id)).toBe(false);
    expect(b.g().state.player).toEqual(player);
    consistent(b);
  });
});

describe("acciones de coleccionables", () => {
  it("solo se compra el de la semana, sin rango, y queda vendido hasta el lunes", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const b = await boot();
    const { currentOffer, buyCollectible } = await import("../features/collectibles/actions");
    const offer = currentOffer().item!;
    expect(offer).toBeDefined();
    const other = [...b.g().state.items.values()].find((i) => i.droppable && i.id !== offer.id && ["mythic", "legendary"].includes(i.rarity));
    if (other) expect(await buyCollectible(other.id)).toBe("away");
    expect(await buyCollectible(offer.id)).toBe("gold");

    // Solo oro: el nivel no importa.
    await addQuest(b, "rich", { conditions: [] });
    await b.g().dispatch({ type: "quest_accepted", questId: "rich" });
    await b.g().dispatch({ type: "quest_completed", questId: "rich", reward: { xp: 0, gold: 400_000 } });
    expect(b.g().state.player.level).toBe(1);
    const n = stored().length;
    expect(await buyCollectible(offer.id)).toBe("ok");
    expect(stored().slice(n).map((e) => e.type)).toEqual(["collectible_purchased"]);
    expect(b.g().state.player.inventory[offer.id]).toBe(1);
    expect(currentOffer()).toMatchObject({ sold: true, item: { id: offer.id } });
    if (other) expect(await buyCollectible(other.id)).toBe("soldOut");
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

describe("editar, deshacer, alta rápida y fallos (features/editing, undo, quickadd y failure)", () => {
  it("editar emite un parche mínimo y deshacer lo revierte, también tras volver a abrir la app", async () => {
    const b = await boot();
    await addQuest(b, "q", { title: "Antes" });
    const editing = await import("../features/editing/actions");
    const undo = await import("../features/undo/actions");
    const def = b.g().state.quests.get("q")!;
    await editing.saveQuestEdit("q", { ...def, title: "Después" });
    expect(lastEvent()).toMatchObject({ type: "quest_updated", patch: { title: "Después" } });
    expect(Object.keys((lastEvent() as { patch: object }).patch)).toEqual(["title"]);
    expect(b.g().state.quests.get("q")?.title).toBe("Después");
    expect(await undo.undoLast()).toBe(true);
    expect(lastEvent().type).toBe("event_undone");
    expect(b.g().state.quests.get("q")?.title).toBe("Antes");
    consistent(b);
    // Al abrir otra vez, con el deshacer en la cola del snapshot, sigue deshecho.
    const again = await boot();
    expect(again.g().state.quests.get("q")?.title).toBe("Antes");
    consistent(again);
  });

  it("deshacer abandonar devuelve la quest en curso con su progreso", async () => {
    const b = await boot();
    await addQuest(b, "q");
    await b.actions.acceptQuest("q");
    await b.actions.addProgress("q", "q-c", 1);
    await b.actions.abandonQuest("q");
    expect(b.g().state.quests.get("q")?.status).toBe("available");
    const undo = await import("../features/undo/actions");
    await undo.undoLast();
    expect(b.g().state.quests.get("q")).toMatchObject({ status: "active", progress: { "q-c": 1 } });
    consistent(b);
  });

  it("deshacer un snapshot ya guardado: el arranque lo reproduce todo", async () => {
    const b = await boot();
    await addQuest(b, "victima");
    await b.actions.retireQuest("victima");
    const del = lastEvent();
    // Más de 100 eventos: el snapshot ya incluye el retiro.
    for (let i = 0; i < 110; i++) await b.g().dispatch({ type: "progress_added", questId: "nada", conditionId: "x", amount: 1 });
    expect(snapshot()?.count).toBeGreaterThanOrEqual(100);
    await b.g().dispatch({ type: "event_undone", eventId: del.id });
    // El deshacer llega dentro de la ventana solo si no han pasado 15 minutos: aquí, milisegundos.
    expect(b.g().state.quests.has("victima")).toBe(true);
    const again = await boot();
    expect(again.g().state.quests.has("victima")).toBe(true);
    consistent(again);
  });

  it("el alta rápida publica la quest de una línea", async () => {
    const b = await boot();
    const quick = await import("../features/quickadd/actions");
    expect(await quick.quickCreate("Llamar al banco mañana #Hogar x2 !")).toBe(true);
    const q = quest(b, "Llamar al banco");
    expect(q).toMatchObject({ category: "elite", area: "Hogar" });
    expect(q.conditions[0]).toMatchObject({ kind: "count", target: 2 });
    expect(q.dueAt).toBeTypeOf("number");
    expect(await quick.quickCreate("   ")).toBe(false);
    consistent(b);
  });

  it("checkFailures fractura lo que pasó su día (y no lo perdonado)", async () => {
    const b = await boot();
    // Hoy a mediodía, después del día en que empiezan los fallos.
    const today = new Date(2026, 9, 20, 12).getTime();
    vi.spyOn(Date, "now").mockReturnValue(today);
    await addQuest(b, "vencida", { dueAt: new Date(2026, 9, 19).getTime() });
    await addQuest(b, "perdonada", { dueAt: new Date(2026, 9, 1).getTime() });
    await addQuest(b, "hoy", { dueAt: new Date(2026, 9, 20).getTime() });
    const failure = await import("../features/failure/actions");
    await failure.checkFailures();
    const st = b.g().state.quests;
    expect(st.get("vencida")?.failedAt).toBeTypeOf("number");
    expect(st.get("perdonada")?.failedAt).toBeUndefined();
    expect(st.get("hoy")?.failedAt).toBeUndefined();
    consistent(b);
  });
});

import { describe, expect, it } from "vitest";
import { conditionsMet, countConditionsMet, effectiveStatus, project } from "./projection";
import { compareEvents, type EventBody, type GameEvent } from "./events";
import { isPomodoroCondition } from "./types";
import { at, MIN, questDef, randomStream, T0, temporalDef, withMeta } from "../test/streams";
import { canonical } from "../features/snapshot/model";
import { linkedQuestDone } from "../features/temporal/model";
import { seededRandom } from "../lib/id";

const created = { type: "quest_created", quest: questDef("q", { reward: { xp: 150, gold: 30 } }) } as const;
const accept = { type: "quest_accepted", questId: "q" } as const;
const complete = { type: "quest_completed", questId: "q", reward: { xp: 150, gold: 30 } } as const;
const plus = (amount = 1) => ({ type: "progress_added", questId: "q", conditionId: "q-c", amount }) as const;

describe("contabilidad de project()", () => {
  it("una quest completada suma su recompensa una sola vez", () => {
    const st = project(withMeta([created, accept, complete, complete]));
    expect(st.player).toMatchObject({ xp: 150, gold: 30, completedCount: 1 });
    expect(st.quests.get("q")?.status).toBe("done");
  });

  it("no cobra una quest que no estaba activa", () => {
    expect(project(withMeta([created, complete])).player.xp).toBe(0);
  });

  it("cobra la recompensa copiada en el evento, no la de la quest", () => {
    expect(project(withMeta([created, accept, { ...complete, reward: { xp: 999, gold: 1 } }])).player.xp).toBe(999);
  });

  it("un encargo cumplido suma, pero solo con sus quests terminadas", () => {
    const t = { type: "temporal_created", temporal: temporalDef("t", { questIds: ["q"] }) } as const;
    const tdone = { type: "temporal_completed", temporalId: "t", reward: { xp: 300, gold: 50 } } as const;
    expect(project(withMeta([created, t, tdone])).player.xp).toBe(0);
    expect(project(withMeta([created, t, accept, complete, tdone])).player).toMatchObject({ xp: 450, gold: 80 });
  });

  it("retirar una quest no quita lo que ya se ganó con ella", () => {
    const st = project(withMeta([created, accept, complete, { type: "quest_deleted", questId: "q" }]));
    expect(st.quests.has("q")).toBe(false);
    expect(st.player).toMatchObject({ xp: 150, completedCount: 1 });
  });
});

describe("guardas de las quests", () => {
  it("un quest_created repetido no pisa la quest", () => {
    const st = project(withMeta([created, accept, { type: "quest_created", quest: questDef("q", { title: "Otra" }) }]));
    expect(st.quests.get("q")).toMatchObject({ title: "Quest q", status: "active" });
  });

  it("aceptar una activa no reinicia su progreso", () => {
    const st = project(withMeta([created, accept, plus(), accept]));
    expect(st.quests.get("q")?.progress).toEqual({ "q-c": 1 });
  });

  it("el progreso solo cuenta en activas y se queda entre 0 y el objetivo", () => {
    expect(project(withMeta([created, plus()])).quests.get("q")?.progress).toEqual({});
    const st = project(withMeta([created, accept, plus(-1), plus(), plus(), plus(), plus()]));
    expect(st.quests.get("q")?.progress).toEqual({ "q-c": 2 });
    expect(countConditionsMet(st.quests.get("q")!)).toBe(true);
  });

  it("el progreso de un objetivo de pomodoro o inexistente se ignora", () => {
    const pq = questDef("q", { conditions: [{ id: "p", kind: "pomodoro", label: "", target: 1, focusMinutes: 25, breakMinutes: 5 }] });
    const st = project(withMeta([{ type: "quest_created", quest: pq }, accept, { ...plus(), conditionId: "p" }, { ...plus(), conditionId: "nada" }]));
    expect(st.quests.get("q")?.progress).toEqual({});
  });

  it("abandonar reinicia el progreso y los pomodoros; abandonar una no activa no hace nada", () => {
    const st = project(withMeta([created, accept, plus(), { type: "quest_abandoned", questId: "q" }]));
    expect(st.quests.get("q")).toMatchObject({ status: "available", progress: {}, acceptedAt: undefined });
    expect(project(withMeta([created, { type: "quest_abandoned", questId: "q" }])).quests.get("q")?.status).toBe("available");
  });

  it("los eventos de una quest retirada se ignoran", () => {
    const st = project(withMeta([created, { type: "quest_deleted", questId: "q" }, accept, complete]));
    expect(st.quests.size).toBe(0);
    expect(st.player.xp).toBe(0);
  });

  it("conditionsMet tiene en cuenta el pomodoro con la hora", () => {
    const pq = questDef("q", { conditions: [{ id: "p", kind: "pomodoro", label: "", target: 1, focusMinutes: 25, breakMinutes: 5 }] });
    const st = project([
      at(T0, { type: "quest_created", quest: pq }),
      at(T0 + MIN, accept),
      at(T0 + 2 * MIN, { type: "pomodoro_started", questId: "q", conditionId: "p" }),
    ]);
    const q = st.quests.get("q")!;
    expect(conditionsMet(q, T0 + 26 * MIN)).toBe(false);
    expect(conditionsMet(q, T0 + 27 * MIN)).toBe(true);
    expect(effectiveStatus(q, T0)).toBe("active");
  });
});

describe("fusión de dispositivos", () => {
  it("dos dispositivos que completan la misma quest sin conexión cobran una vez, lleguen en el orden que lleguen", () => {
    const shared = [at(T0, created), at(T0 + MIN, accept)];
    const laptop = at(T0 + 2 * MIN, complete, "portatil");
    const desktop = at(T0 + 3 * MIN, { ...complete, reward: { xp: 500, gold: 0 } }, "sobremesa");
    const a = project([...shared, laptop, desktop].sort(compareEvents));
    const b = project([desktop, ...shared, laptop].sort(compareEvents));
    expect(canonical(a)).toBe(canonical(b));
    // Gana el primero en el tiempo, con su recompensa.
    expect(a.player.xp).toBe(150);
  });

  it("el progreso de dos dispositivos se suma (deltas, no valores absolutos)", () => {
    const st = project([at(T0, created), at(T0 + MIN, accept), at(T0 + 2 * MIN, plus(), "a"), at(T0 + 3 * MIN, plus(), "b")]);
    expect(st.quests.get("q")?.progress).toEqual({ "q-c": 2 });
  });

  it.each(["m1", "m2", "m3", "m4", "m5"])("semilla %s: unir dos historiales mezclados da lo mismo en cualquier orden", (seed) => {
    const all = randomStream(seed, 300);
    const rnd = seededRandom(seed + "-split");
    const mine = all.filter(() => rnd() < 0.5);
    const theirs = all.filter((e) => !mine.includes(e));
    const merged1 = [...mine, ...theirs].sort(compareEvents);
    const merged2 = [...theirs, ...mine].sort(compareEvents);
    expect(canonical(project(merged1))).toBe(canonical(project(all)));
    expect(canonical(project(merged2))).toBe(canonical(project(all)));
  });

  it("es determinista: dos proyecciones del mismo historial son idénticas", () => {
    const ev = randomStream("det", 500);
    expect(canonical(project(ev))).toBe(canonical(project(ev)));
  });
});

describe("invariantes sobre historiales aleatorios", () => {
  /** Lo que nunca puede pasar, sea cual sea el historial. */
  function checkInvariants(events: GameEvent[]) {
    const st = project(events);
    const { player } = st;
    // La XP incluye al menos lo cobrado en encargos (la suma exacta se comprueba en otro test).
    const earnedTemporal = [...st.temporals.values()].reduce((s, t) => s + (t.earned?.xp ?? 0), 0);
    expect(player.xp).toBeGreaterThanOrEqual(earnedTemporal);
    expect(player.levelXp).toBeGreaterThanOrEqual(0);
    expect(player.levelXp).toBeLessThan(player.levelXpNeeded);
    expect(player.maxActive).toBeGreaterThanOrEqual(4);
    expect(player.maxActive).toBeLessThanOrEqual(10);

    for (const q of st.quests.values()) {
      expect(["available", "active", "cooldown", "done"]).toContain(q.status);
      if (q.status !== "active") {
        expect(q.progress).toEqual({});
        expect(q.acceptedAt).toBeUndefined();
      } else expect(q.acceptedAt).toBeTypeOf("number");
      if (q.status === "cooldown") expect(q.availableAt).toBeTypeOf("number");
      for (const c of q.conditions) {
        const v = q.progress[c.id];
        if (v !== undefined) {
          expect(isPomodoroCondition(c)).toBe(false);
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(c.target);
        }
      }
      // Una pomodoro por cada condición de pomodoro, ni más ni menos.
      expect(Object.keys(q.pomodoros).sort()).toEqual(q.conditions.filter(isPomodoroCondition).map((c) => c.id).sort());
      if (q.status === "done") expect(q.completions).toBeGreaterThan(0);
      if (q.requires) expect(q.requires).not.toContain(q.id);
    }

    // Inventario: solo objetos del almanaque, en unidades positivas, y descubiertos.
    for (const [id, n] of Object.entries(player.inventory)) {
      expect(st.items.has(id)).toBe(true);
      expect(Number.isInteger(n) && n > 0).toBe(true);
      expect(player.discovered[id]).toBeTypeOf("number");
    }

    // Encargos: una quest en un solo encargo pendiente; los cumplidos tienen su recompensa y sus quests terminadas.
    const owner = new Map<string, string>();
    for (const t of st.temporals.values()) {
      expect(new Set(t.questIds).size).toBe(t.questIds.length);
      expect(t.difficulty).toBeGreaterThanOrEqual(1);
      expect(t.difficulty).toBeLessThanOrEqual(5);
      if (t.status === "pending") {
        for (const id of t.questIds) {
          expect(owner.has(id)).toBe(false);
          owner.set(id, t.id);
        }
      } else {
        expect(t.earned).toBeDefined();
        expect(t.completedAt).toBeTypeOf("number");
      }
    }
    for (const q of st.quests.values()) expect(q.temporalId).toBe(owner.get(q.id));
    return st;
  }

  it.each(Array.from({ length: 40 }, (_, i) => `inv${i}`))("semilla %s", (seed) => {
    checkInvariants(randomStream(seed, 500));
  });

  it("la XP es la suma exacta de las recompensas aceptadas", () => {
    // Recalcula la XP a mano: solo cuentan los quest_completed sobre una quest activa en ese momento.
    for (const seed of ["sum1", "sum2", "sum3"]) {
      const ev = randomStream(seed, 400);
      let expected = 0;
      for (let i = 0; i < ev.length; i++) {
        const e = ev[i];
        const prev = project(ev.slice(0, i));
        if (e.type === "quest_completed" && prev.quests.get(e.questId)?.status === "active") expected += e.reward.xp;
        if (e.type === "temporal_completed") {
          const t = prev.temporals.get(e.temporalId);
          const ok = t?.status === "pending" && t.questIds.every((q) => {
            const qs = prev.quests.get(q);
            return !qs || linkedQuestDone(qs, t.linkedAt[q] ?? 0);
          });
          if (ok) expected += Math.max(0, e.reward.xp);
        }
      }
      expect(project(ev).player.xp).toBe(expected);
    }
  });
});

describe("datos antiguos y tolerancia", () => {
  it("una fecha límite no válida se ignora en lugar de romper los plazos", () => {
    const st = project(withMeta([{ type: "quest_created", quest: questDef("q", { dueAt: NaN }) }]));
    expect(st.quests.get("q")?.dueAt).toBeUndefined();
  });

  it("un evento de un tipo desconocido (de una versión futura) se ignora", () => {
    const st = project(withMeta([created, { type: "quest_flagged", questId: "q" } as unknown as EventBody, accept]));
    expect(st.quests.get("q")?.status).toBe("active");
  });
});

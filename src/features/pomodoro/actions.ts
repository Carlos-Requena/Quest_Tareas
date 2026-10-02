import { useGame } from "../../store/game";
import { isPomodoroCondition, type PomodoroConditionDef, type QuestState } from "../../domain/types";
import { sfx } from "../../lib/sfx";
import i18n from "../../i18n";
import type { PomodoroEventBody } from "./events";
import { formatClock, planOf, viewPomodoro, type PomodoroPhase, type PomodoroView } from "./model";

/** Condición de pomodoro de una quest activa y su vista en este instante. */
function current(questId: string, conditionId: string) {
  const q = useGame.getState().state.quests.get(questId);
  const c = q?.conditions.find((x) => x.id === conditionId);
  const p = c && q?.pomodoros[c.id];
  if (!q || q.status !== "active" || !c || !isPomodoroCondition(c) || !p) return undefined;
  return { q, c, view: viewPomodoro(p, planOf(c), Date.now()) };
}

/** Todas las condiciones de pomodoro de las quests activas, con su vista en `now`. */
export function activePomodoros(now: number) {
  const out: { q: QuestState; c: PomodoroConditionDef; view: PomodoroView }[] = [];
  for (const q of useGame.getState().state.quests.values()) {
    if (q.status !== "active") continue;
    for (const c of q.conditions) {
      const p = q.pomodoros[c.id];
      if (isPomodoroCondition(c) && p) out.push({ q, c, view: viewPomodoro(p, planOf(c), now) });
    }
  }
  return out;
}

async function emit(type: PomodoroEventBody["type"], questId: string, conditionId: string, allowed: PomodoroPhase[]) {
  const cur = current(questId, conditionId);
  if (!cur || !allowed.includes(cur.view.phase)) return undefined;
  await useGame.getState().dispatch({ type, questId, conditionId });
  return cur;
}

/** Solo un pomodoro corriendo a la vez en toda la app (concentración o descanso). */
function blockedBy(questId: string, conditionId: string) {
  const busy = activePomodoros(Date.now()).find(
    (x) => !(x.q.id === questId && x.c.id === conditionId) && (x.view.phase === "focus" || x.view.phase === "break"),
  );
  if (!busy) return false;
  sfx.cancel();
  const title = busy.q.title;
  useGame.getState().say(() => i18n.t("pomodoro.otherRunning", { title }));
  return true;
}

export async function startPomodoro(questId: string, conditionId: string) {
  if (blockedBy(questId, conditionId)) return;
  if (await emit("pomodoro_started", questId, conditionId, ["idle"])) sfx.tick();
}

export async function pausePomodoro(questId: string, conditionId: string) {
  if (await emit("pomodoro_paused", questId, conditionId, ["focus", "break"])) sfx.move();
}

export async function resumePomodoro(questId: string, conditionId: string) {
  if (blockedBy(questId, conditionId)) return;
  if (await emit("pomodoro_resumed", questId, conditionId, ["paused"])) sfx.tick();
}

/** Terminar antes de tiempo: se pierde la ronda en curso y se muestra lo hecho. */
export async function stopPomodoro(questId: string, conditionId: string) {
  const cur = await emit("pomodoro_stopped", questId, conditionId, ["focus", "break", "paused"]);
  if (!cur) return;
  sfx.cancel();
  const v = cur.view;
  if (v.segment !== "focus") return; // parar en un descanso no interrumpe ninguna ronda
  const round = v.round;
  const elapsed = formatClock(v.focusMs - v.remainingMs);
  const total = formatClock(v.focusMs);
  useGame.getState().say(() => i18n.t("pomodoro.stopped", { round, elapsed, total }));
}

export async function skipBreak(questId: string, conditionId: string) {
  const cur = current(questId, conditionId);
  if (!cur || cur.view.segment !== "break") return;
  if (await emit("pomodoro_break_skipped", questId, conditionId, ["break", "paused"])) sfx.move();
}

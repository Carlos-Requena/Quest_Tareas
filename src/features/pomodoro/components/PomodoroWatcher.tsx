import { useEffect, useRef } from "react";
import { useGame } from "../../../store/game";
import { useNow } from "../../../lib/time";
import { sfx } from "../../../lib/sfx";
import i18n from "../../../i18n";
import { activePomodoros } from "../actions";
import type { PomodoroView } from "../model";

/**
 * Vigila cada segundo todas las condiciones de pomodoro activas y avisa al
 * terminar una ronda, un descanso o el pomodoro entero, aunque la quest no esté
 * seleccionada. No pinta nada. Al arrancar la app no avisa de lo que ya pasó.
 */
export function PomodoroWatcher() {
  const quests = useGame((s) => s.state.quests);
  const now = useNow(1000);
  const prev = useRef(new Map<string, PomodoroView>());

  useEffect(() => {
    const next = new Map<string, PomodoroView>();
    const say = useGame.getState().say;
    for (const { q, c, view: v } of activePomodoros(now)) {
      const key = `${q.id}:${c.id}`;
      const was = prev.current.get(key);
      const title = q.title;
      if (was && v.completedRounds > was.completedRounds) {
        sfx.bell();
        if (v.done) say(() => i18n.t("pomodoro.allDone", { title }));
        else say(() => i18n.t("pomodoro.focusDone", { title, round: v.completedRounds, rounds: v.rounds }));
      } else if (was && was.segment === "break" && v.segment === "focus" && v.round > was.round && v.phase === "focus") {
        sfx.tick();
        say(() => i18n.t("pomodoro.breakDone", { title, round: v.round, rounds: v.rounds }));
      }
      next.set(key, v);
    }
    prev.current = next;
  }, [quests, now]);

  return null;
}

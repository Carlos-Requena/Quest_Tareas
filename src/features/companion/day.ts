// Del plan de «Mi día» (features/today) a lo que comenta el compañero: la situación y los
// datos para rellenar la frase. Usa el plan (que sale de la proyección): el dominio no
// importa este archivo.

import { formatRemaining } from "../../lib/time";
import type { TodayPlan } from "../today/model";
import { liveStreak } from "../streaks/model";
import { situationOf, type Placeholder, type Situation } from "./model";

export interface CompanionContext {
  situation: Situation;
  vars: Partial<Record<Placeholder, string | number>>;
}

export function companionContext(plan: TodayPlan, now: number): CompanionContext {
  const situation = situationOf({
    tonight: plan.tonight.quests.length + plan.tonight.temporals.length,
    streaks: plan.streaks.length,
    active: plan.active.length,
    due: plan.due.length,
    failed: plan.done.failed,
    done: plan.done.quests + plan.done.temporals,
  });
  switch (situation) {
    case "tonight": {
      const first = plan.tonight.temporals[0] ?? plan.tonight.quests[0];
      return { situation, vars: { title: first?.title ?? "", n: plan.tonight.quests.length + plan.tonight.temporals.length, time: formatRemaining(plan.endsAt - now) } };
    }
    case "streak": {
      const q = plan.streaks[0];
      return { situation, vars: { title: q.title, n: liveStreak(q.streak, now), time: formatRemaining((q.streak?.until ?? now) - now) } };
    }
    case "active": {
      // La última aceptada: la que tiene entre manos.
      const q = plan.active[plan.active.length - 1];
      return { situation, vars: { title: q.title, n: plan.active.length } };
    }
    case "due":
      return { situation, vars: { title: plan.due[0].title, n: plan.due.length } };
    case "failed":
      return { situation, vars: { n: plan.done.failed } };
    case "clear":
      return { situation, vars: { n: plan.done.quests + plan.done.temporals } };
    case "quiet":
      return { situation, vars: {} };
  }
}

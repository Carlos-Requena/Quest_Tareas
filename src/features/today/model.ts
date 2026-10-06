// Modelo puro de la vista «Hoy»: sin React, sin store, sin Tauri, sin DOM. Sin eventos:
// se calcula con lo que hay (quests, encargos, agenda y crónica) y la hora (`now`).
//
// Responde a «¿qué hago ahora?», en orden de urgencia:
//   1. Se pierde esta noche: quests con fecha límite hoy y encargos de hoy (features/failure).
//   2. En curso: las quests aceptadas.
//   3. Rachas en peligro (features/streaks).
//   4. Toca hoy: las que se repiten por días y tocan hoy, y las que ya han vuelto al tablón.
//   5. Vencido de antes: lo que venció antes de existir los fallos y no falla solo.
//   6. Agenda: los bloques y los encargos con hora de hoy.
//   7. Próximos días y lo hecho hoy.
//
// Usa effectiveStatus (la proyección): el dominio no debe importar este archivo.

import type { QuestState } from "../../domain/types";
import { effectiveStatus } from "../../domain/projection";
import { daysUntil, isAccepted, type TemporalState } from "../temporal/model";
import { addDays, dateKey, weekday, type AgendaState } from "../agenda/model";
import { calendarDay, type CalendarDay } from "../calendar/model";
import { recurs, repeatsOnWeekday } from "../complex/model";
import { liveStreak, streakAtRisk } from "../streaks/model";
import { failsAt, notForgiven } from "../failure/model";
import type { ChronicleAcc } from "../chronicle/model";

export interface TodaySources {
  quests: Map<string, QuestState>;
  temporals: Map<string, TemporalState>;
  agenda: Iterable<AgendaState>;
  chronicle: ChronicleAcc;
}

export interface TodayPlan {
  date: string;
  /** Medianoche que cierra el día: lo de «se pierde esta noche» falla entonces. */
  endsAt: number;
  tonight: { quests: QuestState[]; temporals: TemporalState[] };
  active: QuestState[];
  streaks: QuestState[];
  /** Tocan hoy (por días) o ya han vuelto al tablón, sin aceptar. */
  due: QuestState[];
  /** Vencido antes de que existieran los fallos: hay que resolverlo a mano. */
  stale: { quests: QuestState[]; temporals: TemporalState[] };
  agenda: CalendarDay;
  /** Mañana y los dos días siguientes: cuánto hay con fecha cada día. */
  next: { date: string; quests: number; temporals: number; blocks: number }[];
  done: { quests: number; temporals: number; failed: number; xp: number; gold: number };
}

/** Cuántos días siguientes se resumen. */
export const NEXT_DAYS = 3;

/** ¿Se ve en el Quest Board? (las de un encargo sin aceptar esperan en reserva). */
const onBoard = (q: QuestState) => q.status !== "done" && !q.reserved;

export function todayPlan(src: TodaySources, now: number): TodayPlan {
  const date = dateKey(now);
  const endsAt = failsAt(now);
  const quests = [...src.quests.values()].filter(onBoard);
  const pending = [...src.temporals.values()].filter((t) => t.status === "pending");
  const byCreated = (a: QuestState, b: QuestState) => a.createdAt - b.createdAt;

  // Lo de hoy, aceptado o no. Una quest de un encargo de hoy sale con su encargo.
  const tonightTemporals = pending.filter((t) => daysUntil(t.dueAt, now) === 0).sort((a, b) => a.dueAt - b.dueAt);
  const tonightQuests = quests.filter((q) => q.dueAt !== undefined && !recurs(q) && daysUntil(q.dueAt, now) === 0).sort(byCreated);

  const active = quests.filter((q) => q.status === "active").sort((a, b) => (a.acceptedAt ?? 0) - (b.acceptedAt ?? 0));

  // Rachas en peligro: vivas y a menos de unas horas de romperse, o que se rompen antes de acabar el día.
  const streaks = quests
    .filter((q) => recurs(q) && liveStreak(q.streak, now) >= 2 && q.status !== "active" && effectiveStatus(q, now) === "available")
    .filter((q) => streakAtRisk(q.streak, q.cooldownMinutes, now) || (q.streak?.until ?? Infinity) <= endsAt)
    .sort((a, b) => (a.streak?.until ?? 0) - (b.streak?.until ?? 0));
  const shown = new Set([...streaks, ...active].map((q) => q.id));

  // Toca hoy: las de días que tocan hoy y las que se repiten y ya han vuelto, sin aceptar.
  const wd = weekday(date);
  const due = quests
    .filter((q) => !shown.has(q.id) && recurs(q) && effectiveStatus(q, now) === "available")
    .filter((q) => !q.repeatDays?.length || repeatsOnWeekday(q, wd))
    .sort((a, b) => Number(!!b.repeatDays?.length) - Number(!!a.repeatDays?.length) || byCreated(a, b));

  // Vencido de antes: no falla solo (features/failure, FAIL_SINCE_DAY).
  const staleQuests = quests.filter((q) => q.dueAt !== undefined && !recurs(q) && daysUntil(q.dueAt, now) < 0 && !notForgiven(q.dueAt)).sort(byCreated);
  const staleTemporals = pending.filter((t) => daysUntil(t.dueAt, now) < 0 && !notForgiven(t.dueAt)).sort((a, b) => a.dueAt - b.dueAt);

  const cal = { quests: [...src.quests.values()], temporals: [...src.temporals.values()], agenda: [...src.agenda], today: date };
  const agenda = calendarDay(date, cal);

  const next = Array.from({ length: NEXT_DAYS }, (_, i) => {
    const d = addDays(date, i + 1);
    const day = calendarDay(d, cal);
    const items = [...day.allDay, ...day.timed];
    return {
      date: d,
      quests: items.filter((x) => x.kind === "quest").length,
      temporals: items.filter((x) => x.kind === "temporal" && !x.done).length,
      blocks: items.filter((x) => x.kind === "agenda").length,
    };
  });

  const done = { quests: 0, temporals: 0, failed: 0, xp: 0, gold: 0 };
  for (const e of src.chronicle.entries) {
    if (dateKey(e.ts) !== date) continue;
    if (e.k === "quest") done.quests++;
    else if (e.k === "temporal") done.temporals++;
    else if (e.k === "failed") done.failed++;
    if (e.k === "quest" || e.k === "temporal") {
      done.xp += e.xp;
      done.gold += e.gold;
    }
  }

  return {
    date,
    endsAt,
    tonight: { quests: tonightQuests, temporals: tonightTemporals },
    active,
    streaks,
    due,
    stale: { quests: staleQuests, temporals: staleTemporals },
    agenda,
    next,
    done,
  };
}

/** Nada que hacer hoy (para el mensaje de «día libre»). */
export const isQuietDay = (p: TodayPlan) =>
  !p.tonight.quests.length && !p.tonight.temporals.length && !p.active.length && !p.streaks.length && !p.due.length && !p.agenda.timed.length && !p.agenda.allDay.length;

/** Un encargo de hoy sin aceptar: hay que aceptarlo antes de poder cumplirlo. */
export const needsAccepting = (t: TemporalState) => !isAccepted(t);

// Modelo puro de las notificaciones: sin React, sin store, sin Tauri, sin DOM. Sin eventos:
// los avisos se calculan con lo que hay y la hora (`now`); activarlos es una preferencia
// de cada equipo (como el sonido), no un dato del juego.
//
// Qué avisa y cuándo:
//   pomodoro       al acabar cada concentración y cada descanso de un pomodoro en marcha
//   temporal       15 min antes de un encargo con hora; a las 9:00 el día de uno de todo el día
//   temporalBurn   a las 20:00 del día de un encargo sin cumplir: se quemará a medianoche
//   questDue       a las 9:00 del día de la fecha límite de una quest
//   questFracture  a las 20:00 de ese día, si sigue sin completar: se fracturará a medianoche
//   agenda         5 min antes de cada bloque de la agenda
//   streak         3 h antes de que se rompa una racha de 2 o más

import type { QuestState } from "../../domain/types";
import { isPomodoroCondition } from "../../domain/types";
import { planOf, type Pomodoro, type PomodoroPlan } from "../pomodoro/model";
import { daysUntil, type TemporalState } from "../temporal/model";
import { addDays, agendaOn, atMinute, dateKey, type AgendaState } from "../agenda/model";
import { recurs } from "../complex/model";
import { liveStreak } from "../streaks/model";
import { failsAt, notForgiven } from "../failure/model";

export type ReminderKind = "pomodoro" | "temporal" | "temporalBurn" | "questDue" | "questFracture" | "agenda" | "streak";

export interface Reminder {
  /** Identidad estable: el mismo aviso calculado dos veces tiene la misma clave. */
  key: string;
  at: number;
  kind: ReminderKind;
  /** Título de la quest, el encargo o el bloque. */
  title: string;
  /** Datos para el texto: fase del pomodoro, hora, calaveras, racha… */
  params: Record<string, string | number>;
}

/** Horas fijas de los avisos de todo el día (minutos desde medianoche). */
export const MORNING_MINUTES = 9 * 60;
export const EVENING_MINUTES = 20 * 60;
export const TEMPORAL_LEAD_MS = 15 * 60_000;
export const AGENDA_LEAD_MS = 5 * 60_000;
export const STREAK_LEAD_MS = 3 * 3_600_000;
/** Hasta dónde se calculan avisos (en iOS se programan: el sistema admite 64 pendientes). */
export const PLAN_HORIZON_MS = 2 * 86_400_000;
export const MAX_SCHEDULED = 60;

export interface ReminderSources {
  quests: Iterable<QuestState>;
  temporals: Iterable<TemporalState>;
  agenda: Iterable<AgendaState>;
}

/** Los cambios de fase de un pomodoro en marcha que aún no han pasado. */
export function pomodoroBoundaries(p: Pomodoro, plan: PomodoroPlan, now: number): { at: number; phase: "focusDone" | "breakDone" | "allDone"; round: number }[] {
  if (p.status !== "running" || p.runningSince === undefined) return [];
  const F = plan.focusMinutes * 60_000;
  const B = plan.breakMinutes * 60_000;
  const N = Math.max(1, plan.rounds);
  const out: { at: number; phase: "focusDone" | "breakDone" | "allDone"; round: number }[] = [];
  // Instante real de un punto de la línea de tiempo.
  const real = (t: number) => p.runningSince! + (t - p.offsetMs);
  for (let k = 0; k < N; k++) {
    const focusEnd = (k + 1) * F + k * B;
    const at = real(focusEnd);
    if (at > now) out.push({ at, phase: k === N - 1 ? "allDone" : "focusDone", round: k + 1 });
    if (k < N - 1) {
      const breakEnd = (k + 1) * (F + B);
      const bt = real(breakEnd);
      if (bt > now) out.push({ at: bt, phase: "breakDone", round: k + 2 });
    }
  }
  return out;
}

/** Todos los avisos entre `now` y `now + horizon`, por hora. */
export function planReminders(src: ReminderSources, now: number, horizon = PLAN_HORIZON_MS): Reminder[] {
  const until = now + horizon;
  const out: Reminder[] = [];
  const add = (r: Reminder) => {
    if (r.at > now && r.at <= until) out.push(r);
  };
  const today = dateKey(now);
  const days = [today, addDays(today, 1), addDays(today, 2)];

  for (const q of src.quests) {
    if (q.status === "done" || q.reserved) continue;
    // Pomodoros en marcha.
    if (q.status === "active") {
      for (const c of q.conditions) {
        const p = isPomodoroCondition(c) ? q.pomodoros[c.id] : undefined;
        if (!p || !isPomodoroCondition(c)) continue;
        const plan = planOf(c);
        for (const b of pomodoroBoundaries(p, plan, now))
          add({ key: `pomo:${q.id}:${c.id}:${b.phase}:${b.round}:${p.runningSince}`, at: b.at, kind: "pomodoro", title: q.title, params: { phase: b.phase, round: b.round, rounds: plan.rounds } });
      }
    }
    // Fecha límite: por la mañana y, si sigue pendiente, por la tarde (se fracturará).
    if (q.dueAt !== undefined && !recurs(q)) {
      const day = dateKey(q.dueAt);
      add({ key: `due:${q.id}:${day}`, at: atMinute(day, MORNING_MINUTES), kind: "questDue", title: q.title, params: {} });
      if (notForgiven(q.dueAt)) add({ key: `fracture:${q.id}:${day}`, at: atMinute(day, EVENING_MINUTES), kind: "questFracture", title: q.title, params: {} });
    }
    // Racha a punto de romperse.
    if (recurs(q) && q.streak && liveStreak(q.streak, now) >= 2 && q.status !== "active")
      add({ key: `streak:${q.id}:${q.streak.until}`, at: q.streak.until - STREAK_LEAD_MS, kind: "streak", title: q.title, params: { n: q.streak.count } });
  }

  for (const t of src.temporals) {
    if (t.status !== "pending") continue;
    const day = dateKey(t.dueAt);
    if (t.allDay) add({ key: `temporal:${t.id}:${day}`, at: atMinute(day, MORNING_MINUTES), kind: "temporal", title: t.title, params: { skulls: t.difficulty } });
    else add({ key: `temporal:${t.id}:${t.dueAt}`, at: t.dueAt - TEMPORAL_LEAD_MS, kind: "temporal", title: t.title, params: { skulls: t.difficulty, time: t.dueAt } });
    if (notForgiven(t.dueAt) && daysUntil(t.dueAt, now) >= 0) {
      // Por la tarde, o al acabar su hora si es más tarde de las 20:00.
      const evening = Math.max(atMinute(day, EVENING_MINUTES), t.allDay ? 0 : t.dueAt + 60 * 60_000);
      if (evening < failsAt(t.dueAt)) add({ key: `burn:${t.id}:${day}`, at: evening, kind: "temporalBurn", title: t.title, params: { skulls: t.difficulty } });
    }
  }

  // Una lista: un iterador se gastaría en el primer día.
  const agenda = [...src.agenda];
  for (const day of days)
    for (const o of agendaOn(agenda, day)) {
      const start = atMinute(day, o.start);
      add({ key: `agenda:${o.entry.id}:${day}:${o.start}`, at: start - AGENDA_LEAD_MS, kind: "agenda", title: o.entry.title, params: { time: start } });
    }

  return out.sort((a, b) => a.at - b.at || (a.key < b.key ? -1 : 1));
}

/** Id de 32 bits estable para una clave (las notificaciones del sistema se identifican con un número). */
export function notificationId(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Positivo y distinto de 0 (Android e iOS lo prefieren así).
  return (h >>> 1) || 1;
}

/** Huella de un plan: si no cambia, no hace falta volver a programar nada. */
export const planFingerprint = (plan: Reminder[]) => plan.map((r) => `${r.key}@${r.at}`).join("|");

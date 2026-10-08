// Compañero de «Mi día» (features/companion): qué situación tiene el día y lo que dice el
// personaje en cada una. Puro: sin React, Zustand ni DOM. Lo importa el dominio
// (applyCompanionEvent), así que no puede importar el índice ni today/model.ts (que usa la
// proyección): la situación se calcula con un resumen del plan del día.

import { cleanVoice } from "../menu/model";
import type { CompanionEventBody } from "./events";

/** Situación del día, de más a menos urgente. */
export type Situation = "tonight" | "streak" | "active" | "due" | "failed" | "clear" | "quiet";
export const SITUATIONS: readonly Situation[] = ["tonight", "streak", "active", "due", "failed", "clear", "quiet"];

/** Lo que hace falta del plan de hoy (today/model.ts, todayPlan) para elegir la situación. */
export interface DaySummary {
  tonight: number;
  streaks: number;
  active: number;
  due: number;
  failed: number;
  /** Quests y encargos cumplidos hoy. */
  done: number;
}

/**
 * La situación que comenta el compañero: lo que se pierde esta noche, una racha en peligro,
 * lo que hay en curso, lo que toca hoy; sin nada pendiente, lo que se perdió hoy, el día
 * cumplido o el día libre.
 */
export function situationOf(d: DaySummary): Situation {
  if (d.tonight > 0) return "tonight";
  if (d.streaks > 0) return "streak";
  if (d.active > 0) return "active";
  if (d.due > 0) return "due";
  if (d.failed > 0) return "failed";
  if (d.done > 0) return "clear";
  return "quiet";
}

/** Una frase del compañero para una situación, escrita por el jugador. */
export interface CompanionLine {
  id: string;
  /** El personaje que la dice: uno de serie (`builtin:<archivo>`) o uno añadido. */
  characterId: string;
  situation: Situation;
  text: string;
  createdAt: number;
}

export interface CompanionAcc {
  /** El compañero elegido; sin él, el personaje de hoy del menú. */
  chosen?: string;
  lines: Map<string, CompanionLine>;
  /** Frases quitadas: un `companion_line_added` repetido no las resucita. */
  linesDeleted: Set<string>;
}

export const newCompanionAcc = (): CompanionAcc => ({ lines: new Map(), linesDeleted: new Set() });

/**
 * Aplica un evento del compañero. `exists` dice si un personaje existe (los de serie, siempre;
 * los añadidos, mientras no se quiten). Las guardas ignoran los imposibles, como project().
 */
export function applyCompanionEvent(acc: CompanionAcc, e: CompanionEventBody, exists: (id: string) => boolean): void {
  switch (e.type) {
    case "companion_chosen":
      if (e.characterId === undefined || e.characterId === null) delete acc.chosen;
      else if (typeof e.characterId === "string" && exists(e.characterId)) acc.chosen = e.characterId;
      return;
    case "companion_line_added": {
      const l = e.line;
      const text = cleanVoice(l?.text);
      if (!l || typeof l.id !== "string" || !l.id || typeof l.characterId !== "string" || !exists(l.characterId)) return;
      if (!SITUATIONS.includes(l.situation) || !text || acc.lines.has(l.id) || acc.linesDeleted.has(l.id)) return;
      acc.lines.set(l.id, { id: l.id, characterId: l.characterId, situation: l.situation, text, createdAt: Number(l.createdAt) || 0 });
      return;
    }
    case "companion_line_updated": {
      const l = acc.lines.get(e.lineId);
      const text = cleanVoice(e.text);
      if (l && text) acc.lines.set(l.id, { ...l, text });
      return;
    }
    case "companion_line_removed":
      if (acc.lines.delete(e.lineId)) acc.linesDeleted.add(e.lineId);
      return;
  }
}

/** Al quitar un personaje: sus frases se van con él y, si era el compañero, se vuelve al de hoy. */
export function dropCompanionOf(acc: CompanionAcc, characterId: string): void {
  if (acc.chosen === characterId) delete acc.chosen;
  for (const l of acc.lines.values())
    if (l.characterId === characterId) {
      acc.lines.delete(l.id);
      acc.linesDeleted.add(l.id);
    }
}

/** Las frases de un personaje (de una situación, si se dice), en el orden en que se escribieron. */
export function companionLinesOf(lines: Iterable<CompanionLine>, characterId: string, situation?: Situation): CompanionLine[] {
  return [...lines]
    .filter((l) => l.characterId === characterId && (!situation || l.situation === situation))
    .sort((a, b) => a.createdAt - b.createdAt || (a.id < b.id ? -1 : 1));
}

/** Quién acompaña: el elegido, si sigue existiendo; si no, el personaje de hoy del menú. */
export const companionOf = (ids: readonly string[], today: string | undefined, chosen: string | undefined) =>
  chosen && ids.includes(chosen) ? chosen : today;

/** Una de `n` frases (`rnd` en [0, 1)), distinta de la anterior si hay más de una. */
export function pickIndex(n: number, rnd: number, previous?: number): number {
  if (n <= 0) return -1;
  if (n === 1) return 0;
  const i = Math.min(n - 1, Math.max(0, Math.floor(rnd * n)));
  if (previous === undefined || i !== previous) return i;
  return (i + 1) % n;
}

/** Huecos que puede llevar una frase: se cambian por el dato del día. */
export const PLACEHOLDERS = ["title", "n", "time"] as const;
export type Placeholder = (typeof PLACEHOLDERS)[number];

/** Rellena `{{title}}`, `{{n}}` y `{{time}}` de una frase del jugador (lo que falte, se queda vacío). */
export const fillLine = (text: string, vars: Partial<Record<Placeholder, string | number>>): string =>
  text.replace(/\{\{\s*(title|n|time)\s*\}\}/g, (_, k: Placeholder) => String(vars[k] ?? ""));

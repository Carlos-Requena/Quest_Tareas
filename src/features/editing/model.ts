// Modelo puro de la edición de quests: sin React, sin store, sin Tauri, sin DOM.
// El dominio (src/domain) importa SOLO model.ts y events.ts, nunca index.ts.
//
// Una quest se edita con `quest_updated`, un parche con los campos que cambian. Lo que no
// viene en el parche no se toca, así que dos equipos que cambian cosas distintas suman.
// Las quests terminadas (completadas o fallidas) ya no se editan: son historia.

import type { Category, ConditionDef, QuestDef, QuestState } from "../../domain/types";
import { isPomodoroCondition } from "../../domain/types";
import { cleanChecklist, isChecklistCondition } from "../checklist/model";
import { cleanContacts, type ContactRef } from "../contacts/model";
import { cleanRepeatDays, cleanRequires, recurs, wouldCycle, type QuestLookup } from "../complex/model";
import { clampPlan } from "../pomodoro/model";
import { questReward } from "../rewards/model";

const CATEGORIES: readonly Category[] = ["elite", "repeat", "request"];

/**
 * Campos que se pueden cambiar. En los opcionales, `null` quita el valor (JSON no
 * transporta `undefined`): `dueAt: null` deja la quest sin fecha límite.
 */
export interface QuestPatch {
  title?: string;
  description?: string;
  client?: string;
  area?: string;
  kind?: string;
  category?: Category;
  conditions?: ConditionDef[];
  /** Objeto garantizado del almanaque. */
  itemId?: string | null;
  cooldownMinutes?: number | null;
  repeatDays?: number[] | null;
  requires?: string[] | null;
  dueAt?: number | null;
  contacts?: ContactRef[] | null;
}

/**
 * Lo que cambiaría las reglas a mitad de camino: con la quest en curso se ignora (los
 * objetivos tienen progreso y pomodoros en marcha). Se puede cambiar al abandonarla o
 * cuando vuelva al tablón.
 */
export const STRUCTURAL_KEYS = ["category", "conditions", "cooldownMinutes", "repeatDays"] as const satisfies readonly (keyof QuestPatch)[];

/** ¿Se puede editar? Las terminadas (completadas o fallidas) no. */
export const isEditable = (q: Pick<QuestState, "status">) => q.status !== "done";

/** Texto limpio, o `undefined` si no es texto (el campo no cambia). */
const text = (v: unknown) => (typeof v === "string" ? v.trim() : undefined);

/** Objetivos válidos, o `undefined` si el parche no trae ninguno usable. */
function cleanConditions(list: unknown): ConditionDef[] | undefined {
  if (!Array.isArray(list)) return undefined;
  const ids = new Set<string>();
  const out: ConditionDef[] = [];
  for (const c of list as ConditionDef[]) {
    if (!c || typeof c.id !== "string" || !c.id || ids.has(c.id) || typeof c.label !== "string") continue;
    ids.add(c.id);
    if (isChecklistCondition(c)) {
      const clean = cleanChecklist(c);
      if (clean.items.length) out.push(clean);
    } else if (isPomodoroCondition(c)) {
      const plan = clampPlan({ rounds: c.target, focusMinutes: c.focusMinutes, breakMinutes: c.breakMinutes });
      out.push({ ...c, target: plan.rounds, focusMinutes: plan.focusMinutes, breakMinutes: plan.breakMinutes });
    } else {
      const target = Math.round(Number(c.target));
      if (target >= 1) out.push({ id: c.id, kind: "count", label: c.label.trim(), target });
    }
  }
  return out.length ? out : undefined;
}

/**
 * La definición tras aplicar el parche. Puro: no toca `q`. Lo que viene mal formado se
 * ignora campo a campo (el resto del parche sigue valiendo), como en los encargos.
 * `active`: con la quest en curso, los campos de STRUCTURAL_KEYS no cambian.
 */
export function patchQuest(q: QuestState, patch: QuestPatch, active: boolean, quests: QuestLookup): QuestDef {
  const p: QuestPatch = { ...patch };
  if (active) for (const k of STRUCTURAL_KEYS) delete p[k];

  const def: QuestDef = {
    id: q.id,
    title: q.title,
    category: q.category,
    description: q.description,
    client: q.client,
    area: q.area,
    kind: q.kind,
    conditions: q.conditions,
    reward: q.reward,
    cooldownMinutes: q.cooldownMinutes,
    repeatDays: q.repeatDays,
    requires: q.requires,
    dueAt: q.dueAt,
    contacts: q.contacts,
    createdAt: q.createdAt,
  };

  const title = text(p.title);
  if (title) def.title = title;
  for (const k of ["description", "client", "area", "kind"] as const) {
    const v = text(p[k]);
    if (v !== undefined) def[k] = v;
  }
  if (p.category && CATEGORIES.includes(p.category)) def.category = p.category;
  const conditions = cleanConditions(p.conditions);
  if (conditions) def.conditions = conditions;

  if (p.cooldownMinutes === null) def.cooldownMinutes = undefined;
  else if (Number.isFinite(p.cooldownMinutes) && (p.cooldownMinutes as number) >= 0) def.cooldownMinutes = Math.round(p.cooldownMinutes as number);
  if (p.repeatDays !== undefined) def.repeatDays = cleanRepeatDays(p.repeatDays);

  if (p.requires !== undefined) {
    // Sin círculos: no puede pedir una quest que ya depende de ella.
    const ids = cleanRequires({ id: q.id, requires: p.requires ?? undefined });
    const ok = ids?.filter((id) => !wouldCycle(q.id, id, quests));
    def.requires = ok?.length ? ok : undefined;
  }
  if (p.dueAt === null) def.dueAt = undefined;
  else if (Number.isFinite(p.dueAt)) def.dueAt = p.dueAt as number;
  if (p.contacts !== undefined) {
    const contacts = cleanContacts(p.contacts);
    def.contacts = contacts.length ? contacts : undefined;
  }

  // Las que se repiten no tienen fecha límite: tras la primera vuelta quedaría vencida.
  if (recurs(def)) def.dueAt = undefined;

  // XP y oro salen de los objetivos y la categoría (features/rewards); el objeto, del parche o el de antes.
  const itemId = p.itemId === null ? undefined : typeof p.itemId === "string" && p.itemId ? p.itemId : q.reward.itemId;
  def.reward = questReward({ category: def.category, conditions: def.conditions, reward: { xp: 0, gold: 0, itemId } });
  return def;
}

/**
 * El parche mínimo entre la quest y lo que dice el formulario: solo lo que cambia.
 * Si no cambia nada, `undefined` (no se emite ningún evento).
 */
export function diffQuest(q: QuestDef, next: QuestDef): QuestPatch | undefined {
  const patch: QuestPatch = {};
  const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  for (const k of ["title", "description", "client", "area", "kind", "category"] as const) if (q[k] !== next[k]) (patch as Record<string, unknown>)[k] = next[k];
  if (!same(q.conditions, next.conditions)) patch.conditions = next.conditions;
  for (const k of ["cooldownMinutes", "repeatDays", "requires", "dueAt", "contacts"] as const) if (!same(q[k], next[k])) (patch as Record<string, unknown>)[k] = next[k] ?? null;
  if ((q.reward.itemId ?? null) !== (next.reward.itemId ?? null)) patch.itemId = next.reward.itemId ?? null;
  return Object.keys(patch).length ? patch : undefined;
}

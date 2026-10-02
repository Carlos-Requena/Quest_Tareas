// Modelo puro del objetivo de tipo lista: una condición con casillas que se marcan
// una a una («Hacer la maleta: cepillo, cargador, pasaporte…»). Se cumple con todas
// marcadas. Sin React, sin store, sin Tauri, sin DOM. El dominio importa SOLO este
// archivo y events.ts.

/** Una casilla de la lista. El id no cambia aunque cambie el texto. */
export interface ChecklistItem {
  id: string;
  text: string;
}

/** Objetivo de tipo lista: `target` es el número de casillas. */
export interface ChecklistConditionDef {
  id: string;
  kind: "checklist";
  label: string;
  target: number;
  items: ChecklistItem[];
}

export const CHECKLIST_LIMITS = { items: 20, text: 80 } as const;

export const isChecklistCondition = (c: { kind?: string }): c is ChecklistConditionDef => c.kind === "checklist";

/**
 * Datos tolerantes al crear la quest: casillas con id y texto, sin repetir ids, como
 * mucho CHECKLIST_LIMITS.items y `target` igual a las que quedan. Una lista sin
 * casillas válidas se queda sin ninguna (y se cumple sola, como un contador a 0).
 */
export function cleanChecklist(c: ChecklistConditionDef): ChecklistConditionDef {
  const seen = new Set<string>();
  const items = (Array.isArray(c.items) ? c.items : [])
    .filter((it) => it && typeof it.id === "string" && typeof it.text === "string" && it.text.trim() && !seen.has(it.id) && seen.add(it.id))
    .slice(0, CHECKLIST_LIMITS.items)
    .map((it) => ({ id: it.id, text: it.text.trim().slice(0, CHECKLIST_LIMITS.text) }));
  return { ...c, items, target: items.length };
}

/** Casillas marcadas, por id de condición. Va en QuestState y se vacía al aceptar, abandonar o completar. */
export type Checked = Record<string, string[]>;

/**
 * Marca o desmarca una casilla. Es un valor por casilla (no un +1): si dos
 * dispositivos marcan la misma, queda marcada una vez.
 */
export function applyCheck(checked: Checked, cond: ChecklistConditionDef, itemId: string, done: boolean): Checked {
  if (!cond.items.some((it) => it.id === itemId)) return checked;
  const cur = checked[cond.id] ?? [];
  const has = cur.includes(itemId);
  if (has === done) return checked;
  return { ...checked, [cond.id]: done ? [...cur, itemId] : cur.filter((id) => id !== itemId) };
}

/** Casillas marcadas de una lista (solo las que existen). */
export const checklistProgress = (checked: Checked, cond: ChecklistConditionDef) =>
  cond.items.filter((it) => (checked[cond.id] ?? []).includes(it.id)).length;

export const isChecked = (checked: Checked, condId: string, itemId: string) => (checked[condId] ?? []).includes(itemId);

/** Primera casilla sin marcar (atajo `+`). */
export const nextUnchecked = (checked: Checked, cond: ChecklistConditionDef) =>
  cond.items.find((it) => !(checked[cond.id] ?? []).includes(it.id));

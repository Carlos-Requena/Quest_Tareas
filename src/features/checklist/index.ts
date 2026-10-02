// API pública del objetivo de tipo lista para la interfaz.
// OJO: src/domain no debe importar este archivo; el dominio importa ./model y ./events.

export * from "./model";
export type { ChecklistEventBody } from "./events";
export { toggleCheck, checkNext } from "./actions";
export { ChecklistCondition } from "./components/ChecklistCondition";
export { ChecklistInputs } from "./components/ChecklistInputs";

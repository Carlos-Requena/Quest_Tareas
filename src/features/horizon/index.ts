// API pública de los plazos para la interfaz.
// OJO: src/domain no debe importar este archivo; el dominio importa directamente ./model.

export * from "./model";
export { dueDate, dueLabel } from "./format";
export { useHorizonUi, cycleHorizon, filtersOf } from "./ui";
export { HorizonFilter } from "./components/HorizonFilter";
export { DueChip } from "./components/DueChip";
export { DeadlineField } from "./components/DeadlineField";

// API pública de deshacer para la interfaz.
// OJO: src/domain no debe importar este archivo; el dominio importa directamente ./model.

export * from "./model";
export { offerUndo, undo, undoLast } from "./actions";

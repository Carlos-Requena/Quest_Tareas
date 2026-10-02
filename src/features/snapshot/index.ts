// API pública del snapshot para el store.
// OJO: src/domain no debe importar este archivo.

export * from "./model";
export { rebuild, restore, saveSnapshot, verifyAgainstFull, type Restored } from "./restore";

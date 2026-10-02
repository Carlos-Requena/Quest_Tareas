// API pública de los atributos para la interfaz.
// OJO: src/domain no debe importar este archivo; el dominio importa directamente ./model.

export * from "./model";
export { AttributesPanel } from "./components/AttributesPanel";
export { attributeName, areaName, areaSuggestions } from "./labels";

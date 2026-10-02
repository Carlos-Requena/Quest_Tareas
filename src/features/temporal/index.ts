// API pública de los encargos temporales para la interfaz.
// OJO: src/domain no debe importar este archivo (crearía un ciclo con el store);
// el dominio importa directamente ./model y ./events.

export * from "./model";
export type { TemporalEventBody } from "./events";
export * from "./actions";
export { useTemporalUi, temporalBusy } from "./ui";
export { TemporalBoard } from "./components/TemporalBoard";
export { SectionSwitch, switchSection } from "./components/SectionSwitch";
export { TemporalOverlays } from "./components/TemporalOverlays";
export { QuestEventLink } from "./components/QuestEventLink";
export { Skull } from "./components/Skull";
export { linkState, type LinkState } from "./links";

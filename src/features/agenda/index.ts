// API pública de la agenda para la interfaz.
// OJO: src/domain no debe importar este archivo (crearía un ciclo con el store);
// el dominio importa directamente ./model y ./events.

export * from "./model";
export type { AgendaEventBody } from "./events";
export * from "./actions";
export { useAgendaUi, agendaBusy } from "./ui";
export { AgendaFormModal, AGENDA_COLOR_VAR } from "./components/AgendaForm";

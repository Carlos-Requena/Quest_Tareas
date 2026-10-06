// API pública de los fallos para la interfaz.
// OJO: src/domain no debe importar este archivo; el dominio importa directamente ./model.

export * from "./model";
export { checkFailures, noticeFailures, repostQuest, repostTemporal } from "./actions";
export { useFailureUi, failureBusy } from "./ui";
export { FailureWatcher } from "./components/FailureWatcher";
export { FailureOverlay } from "./components/FailureOverlay";

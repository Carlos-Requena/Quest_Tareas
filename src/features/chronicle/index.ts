// API pública de la crónica para la interfaz.
// OJO: src/domain no debe importar este archivo; el dominio importa ./model.

export * from "./model";
export { useChronicleUi, openChronicle, chronicleBusy } from "./ui";
export { ChronicleModal } from "./components/ChronicleModal";
export { ChronicleButton, DiaryIcon } from "./components/ChronicleButton";

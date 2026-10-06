// API pública del alta rápida para la interfaz. Sin eventos propios: publica `quest_created`.

export * from "./model";
export { quickCreate, quickDetails, quickQuest } from "./actions";
export { useQuickUi, quickBusy } from "./ui";
export { QuickAddForm, QuickAddSheet } from "./components/QuickAdd";

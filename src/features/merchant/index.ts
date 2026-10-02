// API pública del mercader (Hu Tao) para la interfaz.
// OJO: src/domain no debe importar este archivo (crearía un ciclo con el store);
// el dominio importa directamente ./model y ./events.

export * from "./model";
export type { MerchantEventBody } from "./events";
export * from "./actions";
export { useMerchantUi, openMerchant, merchantBusy, type MerchantTab } from "./ui";
export { MerchantModal } from "./components/MerchantModal";
export { MerchantButton, LanternIcon } from "./components/MerchantButton";
export { GearArt, gearStyle } from "./components/GearArt";
export { SlotGlyph } from "./components/SlotGlyph";

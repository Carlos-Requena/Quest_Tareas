// API pública de la oferta de coleccionables para la interfaz.
// OJO: src/domain no debe importar este archivo (crearía un ciclo con el store);
// el dominio importa directamente ./model y ./events.

export * from "./model";
export type { CollectibleEventBody } from "./events";
export * from "./actions";
export { OfferPanel } from "./components/OfferPanel";

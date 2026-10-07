// API pública del equipo (muñeco, armario y decoración del menú) para la interfaz.
// OJO: src/domain no debe importar este archivo (crearía un ciclo con el store);
// el dominio importa directamente ./model y ./events.

export * from "./model";
export type { EquipmentEventBody } from "./events";
export * from "./actions";
export { useCharacterUi, openCharacter, characterBusy } from "./ui";
export { CharacterModal } from "./components/CharacterModal";
export { HelmetIcon } from "./components/HelmetIcon";
export { Backdrop, DecorEmblem } from "./components/Decor";
export { Doll } from "./components/Doll";

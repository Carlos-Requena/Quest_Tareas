// API pública de la armería de serie para la interfaz.
// OJO: src/domain y merchant/model.ts importan ./model, nunca este archivo.

export { BUILTIN_GEAR, isBuiltinGear, armorySource, builtinArt, armoryKey } from "./model";
export { gearName, gearDescription } from "./labels";
export { SOURCES, type ArmorySource } from "./catalog";

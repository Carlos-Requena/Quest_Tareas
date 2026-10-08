// Ilustraciones de «Encargo cumplido»: las imágenes de public/temporal/<tipo>/, una carpeta
// por tipo de encargo (summons, delivery, hunt, scout, gathering). Para añadir una basta con
// dejar el archivo (.webp o .png, mejor con fondo transparente) en la carpeta de su tipo. Las
// lista Vite al compilar (plugin temporalHeroes de vite.config.ts), porque JavaScript no puede
// leer una carpeta.

import FILES from "virtual:temporal-heroes";
import { heroesByKind, pickHero, type TemporalKind } from "./model";

const BASE = import.meta.env.BASE_URL;
const HEROES = heroesByKind(FILES);

/** La URL de una ilustración al azar del tipo; sin ninguna, `undefined` (la silueta del aventurero). */
export function heroFor(kind: TemporalKind): string | undefined {
  const file = pickHero(HEROES, kind, Math.random());
  return file && encodeURI(`${BASE}temporal/${file}`);
}

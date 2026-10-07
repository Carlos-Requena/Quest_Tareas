/// <reference types="vite/client" />

/** Versión de package.json, puesta por Vite al compilar (vite.config.ts). */
declare const __APP_VERSION__: string;

/** Los .webp de public/menu/: los personajes de serie del menú (plugin menuCharacters de vite.config.ts). */
declare module "virtual:menu-characters" {
  const files: string[];
  export default files;
}

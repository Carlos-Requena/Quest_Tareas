import { useSyncExternalStore } from "react";
import { music } from "./player";

/** Estado del reproductor como hook de React (se vuelve a pintar al cambiar). */
export function useMusic() {
  return useSyncExternalStore(music.subscribe, music.getSnapshot);
}

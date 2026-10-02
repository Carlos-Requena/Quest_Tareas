import { useSyncExternalStore } from "react";
import { isMuted, onMutedChange } from "./sfx";

/** Silencio general como hook de React. */
export function useMuted() {
  return useSyncExternalStore(onMutedChange, isMuted);
}

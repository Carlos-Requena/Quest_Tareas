// Estado de la sincronización para la interfaz (no va en eventos).

import { create } from "zustand";
import type { SyncPhase, SyncReport } from "./model";
import type { Account } from "./drive";

interface SyncUi {
  phase: SyncPhase;
  account?: Account;
  /** La última sincronización que terminó bien. */
  last?: SyncReport;
  /** Código del último fallo (NativeError.code), para el texto del panel. */
  error?: string;
  set(patch: Partial<Omit<SyncUi, "set">>): void;
}

export const useSyncUi = create<SyncUi>((set) => ({
  phase: "unavailable",
  set: (patch) => set(patch),
}));

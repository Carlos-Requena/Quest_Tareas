// Puente con la parte nativa (src-tauri/src/sync): Google y Drive los maneja Rust.
// El JavaScript nunca ve un token; solo pide «lista», «baja», «sube».

import { invoke } from "@tauri-apps/api/core";
import type { DriveApi } from "./engine";
import type { RemoteFile } from "./model";

export interface Account {
  email: string;
  name?: string | null;
}

/** Error de Rust (SyncError serializado): un `code` estable para traducirlo. */
export interface NativeError {
  code: "not_configured" | "signed_out" | "consent_denied" | "missing_scope" | "timeout" | "network" | "auth" | "keyring" | "drive" | "other";
  status?: number | null;
  detail?: string;
}

export const isNativeError = (e: unknown): e is NativeError => !!e && typeof e === "object" && typeof (e as NativeError).code === "string";

export const native = {
  configured: () => invoke<boolean>("sync_configured"),
  signedIn: () => invoke<boolean>("sync_signed_in"),
  signIn: () => invoke<Account>("sync_sign_in"),
  signOut: () => invoke<void>("sync_sign_out"),
  account: () => invoke<Account>("sync_account"),
};

export const tauriDrive: DriveApi = {
  list: (kind) => invoke<RemoteFile[]>("drive_list", { kind }),
  download: async (fileId) => new Uint8Array(await invoke<ArrayBuffer>("drive_download", { fileId })),
  upload: (request) => invoke<RemoteFile>("drive_upload", { request }),
};

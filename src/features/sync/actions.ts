// Casos de uso de la sincronización: conectar, desconectar, sincronizar y cuándo hacerlo.
// La lógica de qué se sube y qué se baja está en engine.ts y model.ts; aquí solo se le
// pasan las piezas de verdad (store, almacén de binarios, Drive vía Rust).

import i18n from "../../i18n";
import { useGame } from "../../store/game";
import { isTauri } from "../../storage/eventStore";
import { openBlobStore } from "../../storage/blobStore";
import { liveBlobIds } from "../temporal/model";
import { gearBlobIds } from "../merchant/model";
import { characterBlobIds } from "../menu/model";
import { runSync } from "./engine";
import { CLOSE_TIMEOUT_MS, SYNC_EVERY_MS, type SyncReport } from "./model";
import { isNativeError, native, tauriDrive } from "./drive";
import { forgetSync, readAccount, readCursors, writeAccount, writeCursors } from "./storage";
import { useSyncUi } from "./ui";

type ToastKey = "connected" | "disconnected" | "done" | "pulled" | "expired" | "denied" | "missingScope" | "timeout" | "offline" | "failed";
const say = (key: ToastKey, opts?: { count?: number; email?: string }) => useGame.getState().say(() => i18n.t(`sync.toast.${key}`, opts ?? {}));
const ui = () => useSyncUi.getState();

let running: Promise<SyncReport | undefined> | undefined;
let timer: ReturnType<typeof setInterval> | undefined;
let started = false;

/** Al arrancar la app (SyncWatcher): mira si se puede sincronizar y, si hay sesión, sincroniza. */
export async function initSync(): Promise<void> {
  if (started) return;
  started = true;
  if (!isTauri()) return ui().set({ phase: "unavailable" });
  try {
    if (!(await native.configured())) return ui().set({ phase: "unconfigured" });
    const signedIn = await native.signedIn();
    ui().set({ phase: signedIn ? "idle" : "signedOut", account: signedIn ? await readAccount() : undefined });
    watchClose();
    if (signedIn) {
      schedule();
      void syncNow();
    }
  } catch (err) {
    console.error("[sync]", err);
    ui().set({ phase: "error", error: isNativeError(err) ? err.code : "other" });
  }
}

/** Sincroniza ahora. Si ya hay una en marcha, devuelve esa (nunca dos a la vez). */
export function syncNow(opts: { manual?: boolean } = {}): Promise<SyncReport | undefined> {
  running ??= run(opts.manual ?? false).finally(() => (running = undefined));
  return running;
}

async function run(manual: boolean): Promise<SyncReport | undefined> {
  const { store } = useGame.getState();
  const phase = ui().phase;
  if (!store || (phase !== "idle" && phase !== "error")) return;
  ui().set({ phase: "syncing", error: undefined });
  try {
    const report = await runSync({
      events: store,
      blobs: await openBlobStore(),
      drive: tauriDrive,
      readCursors,
      writeCursors,
      onMerged: () => useGame.getState().rebuild(),
      usedBlobs: () => {
        const { state } = useGame.getState();
        return new Set([...liveBlobIds(state.temporals.values()), ...gearBlobIds(state.gear.values()), ...characterBlobIds(state.characters.values())]);
      },
      now: Date.now,
    });
    ui().set({ phase: "idle", last: report });
    if (report.pulled > 0) say("pulled", { count: report.pulled });
    else if (manual) say("done");
    return report;
  } catch (err) {
    console.error("[sync]", err);
    const code = isNativeError(err) ? err.code : "other";
    if (code === "signed_out") {
      // El permiso caducó (7 días con la app en pruebas) o se retiró desde Google.
      stop();
      ui().set({ phase: "signedOut", error: code });
      say("expired");
      return;
    }
    ui().set({ phase: "error", error: code });
    // Sin conexión no se avisa en las automáticas: el icono ya lo dice y se reintenta solo.
    if (manual || code !== "network") say(code === "network" ? "offline" : "failed");
    return;
  }
}

export async function signIn(): Promise<void> {
  if (ui().phase !== "signedOut" && ui().phase !== "error") return;
  ui().set({ phase: "signingIn", error: undefined });
  try {
    const account = await native.signIn();
    await writeAccount(account);
    ui().set({ phase: "idle", account });
    say("connected", { email: account.email });
    schedule();
    await syncNow({ manual: true });
  } catch (err) {
    console.error("[sync]", err);
    const code = isNativeError(err) ? err.code : "other";
    // iOS: se cerró la hoja de Google sin terminar. No es un fallo: no se avisa.
    if (code === "cancelled") return ui().set({ phase: "signedOut", error: undefined });
    ui().set({ phase: "signedOut", error: code });
    const keys: Record<string, ToastKey> = { consent_denied: "denied", missing_scope: "missingScope", timeout: "timeout", network: "offline" };
    say(keys[code] ?? "failed");
  }
}

export async function signOut(): Promise<void> {
  if (running) await running;
  stop();
  try {
    await native.signOut();
  } finally {
    await forgetSync();
    ui().set({ phase: "signedOut", account: undefined, last: undefined, error: undefined });
    say("disconnected");
  }
}

/**
 * Cada SYNC_EVERY_MS, al volver a la ventana (si hace más de un minuto de la última) y al
 * ocultarla si hay algo sin subir. En el iPhone no hay «cerrar la ventana»: salir de la app
 * la oculta, y es la última ocasión de subir lo pendiente antes de que iOS la suspenda.
 */
function schedule() {
  stop();
  timer = setInterval(() => void syncNow(), SYNC_EVERY_MS);
  document.addEventListener("visibilitychange", onVisible);
}

function stop() {
  if (timer) clearInterval(timer);
  timer = undefined;
  document.removeEventListener("visibilitychange", onVisible);
}

function onVisible() {
  if (document.visibilityState === "hidden") return void syncIfPending();
  const last = ui().last?.at ?? 0;
  if (Date.now() - last > 60_000) void syncNow();
}

async function syncIfPending() {
  const { store } = useGame.getState();
  if (store && (await store.unsynced()).length > 0) void syncNow();
}

/** Al cerrar la ventana: una última sincronización si hay algo sin subir (como mucho CLOSE_TIMEOUT_MS). */
async function watchClose() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const win = getCurrentWindow();
  let closing = false;
  await win.onCloseRequested(async (event) => {
    if (closing) return;
    const { store } = useGame.getState();
    const phase = ui().phase;
    if (!store || (phase !== "idle" && phase !== "syncing" && phase !== "error")) return;
    if (!running && (await store.unsynced()).length === 0) return;
    event.preventDefault();
    closing = true;
    await Promise.race([syncNow(), new Promise((r) => setTimeout(r, CLOSE_TIMEOUT_MS))]);
    await win.destroy();
  });
}

// Servicio de notificaciones del sistema (no es dominio: habla con Tauri y con el navegador).
//
// - iPhone: el sistema puede avisar con la app cerrada, así que se PROGRAMAN (`Schedule.at`)
//   los avisos de los dos próximos días; cuando el plan cambia, se cancelan y se vuelven a
//   programar (iOS admite 64 pendientes; se programan como mucho MAX_SCHEDULED).
// - Escritorio: tauri-plugin-notification solo enseña avisos al momento (no los programa),
//   así que un temporizador espera al siguiente. Con la ventana delante, el aviso sale en la
//   app (el de siempre, abajo); con la ventana detrás o minimizada, en el sistema.
// - Navegador de desarrollo (`pnpm dev`): la API Notification del navegador.
//
// Activarlas es una preferencia de cada equipo (`quests.notify`), como el sonido.

import { isTauri } from "../../storage/eventStore";
import i18n from "../../i18n";
import { MAX_SCHEDULED, notificationId, planFingerprint, type Reminder } from "./model";

const PREF_KEY = "quests.notify";
const IDS_KEY = "quests.notifyIds";

export const isIOS = () => isTauri() && /iPhone|iPad|iPod/.test(navigator.userAgent);

export function notifyEnabled(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) === "on";
  } catch {
    return false;
  }
}

function setPref(on: boolean) {
  try {
    localStorage.setItem(PREF_KEY, on ? "on" : "off");
  } catch {
    // Sin almacenamiento: solo dura esta sesión.
  }
  listeners.forEach((fn) => fn(on));
}

const listeners = new Set<(on: boolean) => void>();
export function onNotifyChange(fn: (on: boolean) => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/** Pide permiso al sistema. Devuelve si quedan activadas. */
export async function enableNotifications(): Promise<boolean> {
  let granted = false;
  try {
    if (isTauri()) {
      const n = await import("@tauri-apps/plugin-notification");
      granted = (await n.isPermissionGranted()) || (await n.requestPermission()) === "granted";
    } else if ("Notification" in window) {
      granted = Notification.permission === "granted" || (await Notification.requestPermission()) === "granted";
    }
  } catch (err) {
    console.error(err);
  }
  setPref(granted);
  return granted;
}

export async function disableNotifications() {
  setPref(false);
  await unscheduleAll();
}

/** El texto de un aviso, en el idioma activo. */
export function reminderText(r: Reminder): { title: string; body: string } {
  const p = r.params;
  const clock = (ms: number) => new Intl.DateTimeFormat(i18n.language === "ja" ? "ja-JP" : "es-ES", { hour: "2-digit", minute: "2-digit" }).format(ms);
  switch (r.kind) {
    case "pomodoro":
      return {
        title: r.title,
        body:
          p.phase === "allDone"
            ? i18n.t("notifications.pomodoro.allDone")
            : p.phase === "focusDone"
              ? i18n.t("notifications.pomodoro.focusDone", { round: p.round, rounds: p.rounds })
              : i18n.t("notifications.pomodoro.breakDone", { round: p.round, rounds: p.rounds }),
      };
    case "temporal":
      return { title: r.title, body: p.time ? i18n.t("notifications.temporal.soon", { time: clock(Number(p.time)) }) : i18n.t("notifications.temporal.today") };
    case "temporalBurn":
      return { title: r.title, body: i18n.t("notifications.temporal.burn") };
    case "questDue":
      return { title: r.title, body: i18n.t("notifications.quest.due") };
    case "questFracture":
      return { title: r.title, body: i18n.t("notifications.quest.fracture") };
    case "agenda":
      return { title: r.title, body: i18n.t("notifications.agenda", { time: clock(Number(p.time)) }) };
    case "streak":
      return { title: r.title, body: i18n.t("notifications.streak", { n: p.n }) };
  }
}

/** Enseña un aviso ya (escritorio y navegador). */
export async function showNow(r: Reminder) {
  const { title, body } = reminderText(r);
  try {
    if (isTauri()) {
      const n = await import("@tauri-apps/plugin-notification");
      n.sendNotification({ title, body });
    } else if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, tag: r.key });
    }
  } catch (err) {
    console.error(err);
  }
}

// ───────────── iPhone: avisos programados ─────────────

let lastPlan = "";

function readIds(): number[] {
  try {
    const v = JSON.parse(localStorage.getItem(IDS_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => Number.isInteger(x)) : [];
  } catch {
    return [];
  }
}

function writeIds(ids: number[]) {
  try {
    localStorage.setItem(IDS_KEY, JSON.stringify(ids));
  } catch {
    // Sin almacenamiento: la próxima vez se cancelan los que el sistema diga pendientes.
  }
}

/** Programa el plan en el sistema (iOS). No hace nada si no ha cambiado desde la última vez. */
export async function schedulePlan(plan: Reminder[]) {
  const list = plan.slice(0, MAX_SCHEDULED);
  const print = planFingerprint(list) + i18n.language;
  if (print === lastPlan) return;
  lastPlan = print;
  try {
    const n = await import("@tauri-apps/plugin-notification");
    const old = readIds();
    if (old.length) await n.cancel(old);
    const ids: number[] = [];
    for (const r of list) {
      const id = notificationId(r.key);
      const { title, body } = reminderText(r);
      n.sendNotification({ id, title, body, schedule: n.Schedule.at(new Date(r.at)) });
      ids.push(id);
    }
    writeIds(ids);
  } catch (err) {
    console.error(err);
    lastPlan = "";
  }
}

/** Quita los avisos programados (al desactivarlas). */
export async function unscheduleAll() {
  lastPlan = "";
  if (!isIOS()) return;
  try {
    const n = await import("@tauri-apps/plugin-notification");
    const old = readIds();
    if (old.length) await n.cancel(old);
    writeIds([]);
  } catch (err) {
    console.error(err);
  }
}

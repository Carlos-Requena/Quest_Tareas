import { useEffect } from "react";
import { useGame } from "../../../store/game";
import { formatRemaining, useNow } from "../../../lib/time";
import { sfx } from "../../../lib/sfx";
import i18n from "../../../i18n";
import { remindersDue, sortTemporals, urgencyOf } from "../model";
import { useTemporalUi } from "../ui";

/** Antelación del aviso de un encargo con hora. */
const SOON_MS = 15 * 60_000;

// Una vez por sesión: al abrir la app y por cada encargo que se acerca.
let greeted = false;
const warned = new Set<string>();

/**
 * Recordatorios dentro de la app (sin notificaciones del sistema, que en Tauri
 * necesitarían otro plugin): al abrirla, un aviso con los encargos de hoy o
 * vencidos; y 15 minutos antes de uno con hora, un aviso con campana. No pinta nada.
 */
export function TemporalWatcher() {
  const ready = useGame((s) => s.ready);
  const temporals = useGame((s) => s.state.temporals);
  const now = useNow(30_000);

  useEffect(() => {
    if (!ready || useTemporalUi.getState().posted) return;
    const say = useGame.getState().say;
    // Lo que empieza ya tiene prioridad: un solo aviso a la vez (el último tapa al anterior).
    const soon = remindersDue(temporals.values(), now, SOON_MS).filter((t) => !warned.has(t.id));
    if (soon.length) {
      soon.forEach((t) => warned.add(t.id));
      greeted = true;
      const t = soon[0];
      // Sin una interacción previa el WebView bloquea el audio: entonces solo el aviso.
      if (navigator.userActivation?.hasBeenActive ?? true) sfx.bell();
      say(() => i18n.t("temporal.reminder.soon", { title: t.title, time: formatRemaining(t.dueAt - Date.now()) }));
      return;
    }
    if (!greeted) {
      greeted = true;
      const urgent = sortTemporals(temporals.values()).filter((t) => ["today", "overdue"].includes(urgencyOf(t, now)));
      if (urgent.length) say(() => i18n.t("temporal.reminder.pending", { count: urgent.length, title: urgent[0].title }));
    }
  }, [ready, temporals, now]);

  return null;
}

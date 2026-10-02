import { useEffect, useState } from "react";
import i18n from "../i18n";

export function formatRemaining(ms: number): string {
  const min = Math.max(1, Math.ceil(ms / 60_000));
  if (min < 60) return i18n.t("time.minutes", { n: min });
  const h = Math.floor(min / 60);
  if (h < 24) {
    return min % 60 ? i18n.t("time.hoursMinutes", { h, m: min % 60 }) : i18n.t("time.hours", { n: h });
  }
  const d = Math.floor(h / 24);
  return h % 24 ? i18n.t("time.daysHours", { d, h: h % 24 }) : i18n.t("time.days", { n: d });
}

/** Reloj que se actualiza periódicamente (para los tiempos de reaparición). */
export function useNow(intervalMs = 20_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

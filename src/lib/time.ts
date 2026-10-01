import { useEffect, useState } from "react";

export function formatRemaining(ms: number): string {
  const min = Math.max(1, Math.ceil(ms / 60_000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ${min % 60 ? `${min % 60} min` : ""}`.trim();
  const d = Math.floor(h / 24);
  return `${d} d ${h % 24 ? `${h % 24} h` : ""}`.trim();
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

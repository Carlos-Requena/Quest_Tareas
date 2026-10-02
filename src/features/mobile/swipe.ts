// Deslizar el dedo para pasar página (diario, almanaque). Con eventos de puntero: también
// vale con el ratón, arrastrando. El elemento necesita `touch-action: pan-y` (mobile.css,
// .m-swipe) para que el navegador no se quede el gesto horizontal.

import { useRef } from "react";

/** Recorrido mínimo, en px, y cuánto más horizontal que vertical tiene que ser. */
const MIN_DX = 50;
const SLOPE = 1.5;

/** `dir` es 1 hacia la página siguiente (dedo hacia la izquierda) y -1 hacia la anterior. */
export function useSwipe(onSwipe: (dir: 1 | -1) => void) {
  const start = useRef<{ x: number; y: number }>(undefined);
  return {
    onPointerDown: (e: React.PointerEvent) => {
      start.current = { x: e.clientX, y: e.clientY };
    },
    onPointerUp: (e: React.PointerEvent) => {
      const s = start.current;
      start.current = undefined;
      if (!s) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (Math.abs(dx) >= MIN_DX && Math.abs(dx) > Math.abs(dy) * SLOPE) onSwipe(dx < 0 ? 1 : -1);
    },
    onPointerCancel: () => {
      start.current = undefined;
    },
  };
}

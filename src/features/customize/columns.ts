// Columnas de las rejillas de retratos: menos en el teléfono y en la ventana estrecha del
// escritorio (hasta 1.180 px, el mismo corte que el menú de opciones), para que cada tarjeta
// tenga sitio para su nombre. Los huecos «+» completan las filas con este mismo número.

import { useSyncExternalStore } from "react";
import { useIsPhone } from "../mobile";

const NARROW_QUERY = "(max-width: 1180px)";

const media = () => (typeof window === "undefined" || !window.matchMedia ? undefined : window.matchMedia(NARROW_QUERY));
const isNarrow = (): boolean => media()?.matches ?? false;

function subscribe(onChange: () => void) {
  const m = media();
  m?.addEventListener("change", onChange);
  return () => m?.removeEventListener("change", onChange);
}

export function useGridCols(wide: number, narrow: number, phone = 3): number {
  const phoneNow = useIsPhone();
  const narrowNow = useSyncExternalStore(subscribe, isNarrow, () => false);
  return phoneNow ? phone : narrowNow ? narrow : wide;
}

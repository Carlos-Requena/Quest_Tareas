// ¿Pantalla de teléfono? La interfaz se adapta casi entera con CSS (@media (max-width: 760px),
// en mobile.css y en el CSS de cada funcionalidad); esto es para lo poco que lo necesita en
// JavaScript, como abrir el detalle de una quest al tocar su tarjeta.
//
// OJO: el número está repetido en los @media del CSS. Si se cambia aquí, se cambia allí.

import { useSyncExternalStore } from "react";

export const PHONE_MAX_WIDTH = 760;
export const PHONE_QUERY = `(max-width: ${PHONE_MAX_WIDTH}px)`;

const media = () => (typeof window === "undefined" || !window.matchMedia ? undefined : window.matchMedia(PHONE_QUERY));

export const isPhone = (): boolean => media()?.matches ?? false;

function subscribe(onChange: () => void) {
  const m = media();
  m?.addEventListener("change", onChange);
  return () => m?.removeEventListener("change", onChange);
}

/** Vuelve a pintar el componente al pasar de ventana ancha a teléfono (o al girar una tableta). */
export function useIsPhone(): boolean {
  return useSyncExternalStore(subscribe, isPhone, () => false);
}

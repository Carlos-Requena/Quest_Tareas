// Arrastrar para cerrar (y para la acción rápida de una tarjeta): el elemento sigue al dedo y, al
// soltarlo, o sale (pasó del umbral o iba rápido) o vuelve a su sitio. Solo en el teléfono. Con
// eventos de puntero, como swipe.ts; el elemento necesita el `touch-action` que deje al navegador
// el otro eje (`pan-y` si se arrastra en horizontal) o `none` en el asa de una hoja.

import { useRef } from "react";
import { calm } from "../../lib/fx";
import { haptic } from "../../lib/haptics";
import { isPhone } from "./phone";

/** A partir de cuántos px se decide si el gesto es nuestro (y no un desplazamiento). */
const LOCK = 8;
/** Fracción del tamaño del elemento que hay que recorrer para que salga. */
const DISMISS_AT = 0.3;
/** Velocidad (px/ms) que basta para que salga aunque no llegue al umbral. */
const FLICK = 0.6;
const OUT_MS = 200;
const BACK_MS = 260;

interface Options {
  /** `x`: hacia la derecha (volver, tarjetas); `y`: hacia abajo (hojas). */
  axis: "x" | "y";
  /** Lo que pasa al soltar pasado el umbral. */
  onDismiss(): void;
  /** Solo empieza a menos de estos px del borde izquierdo (volver desde el borde). */
  edge?: number;
  /** Solo empieza dentro de un elemento con `data-drag-handle` (el asa de una hoja). */
  handle?: boolean;
  /** No sale de la pantalla: vuelve a su sitio y llama a `onDismiss` (la acción de una tarjeta). */
  stay?: boolean;
  /** Fracción del umbral, si no vale el 30 %. */
  at?: number;
  /** Avisa del recorrido (0…1 del umbral), para dibujar lo que asoma detrás. */
  onProgress?(p: number): void;
  /**
   * `false`: el elemento no se mueve (solo `onProgress`), para lo que ya anima otro (las tarjetas,
   * con Motion y GSAP).
   */
  move?: boolean;
  disabled?: boolean;
}

interface Drag {
  id: number;
  x: number;
  y: number;
  /** Último recorrido y cuándo; y la velocidad (px/ms) de los últimos movimientos. */
  t: number;
  d: number;
  v: number;
  locked: boolean;
}

export function useDragDismiss<T extends HTMLElement>(opts: Options, external?: React.RefObject<T | null>) {
  const own = useRef<T>(null);
  const ref = external ?? own;
  const drag = useRef<Drag | undefined>(undefined);
  // Si el dedo arrastró, el clic que llega justo al soltar no debe abrir lo que hay debajo. Se
  // guarda cuándo terminó el arrastre: un clic posterior (otro toque) sí vale.
  const draggedAt = useRef(0);

  const set = (d: number, ms = 0) => {
    const el = ref.current;
    if (!el || opts.move === false) return;
    el.style.transition = ms ? `transform ${ms}ms cubic-bezier(0.2, 0.8, 0.2, 1)` : "none";
    el.style.transform = d ? (opts.axis === "x" ? `translate3d(${d}px, 0, 0)` : `translate3d(0, ${d}px, 0)`) : "";
  };
  const clear = () => {
    const el = ref.current;
    if (!el || opts.move === false) return;
    el.style.transition = "";
    el.style.transform = "";
  };
  const size = () => {
    const el = ref.current;
    return el ? (opts.axis === "x" ? el.offsetWidth : el.offsetHeight) : 1;
  };
  const end = () => {
    drag.current = undefined;
    opts.onProgress?.(0);
  };

  return {
    ref,
    onPointerDown(e: React.PointerEvent) {
      if (opts.disabled || !isPhone() || e.pointerType === "mouse" || drag.current) return;
      if (opts.edge !== undefined && e.clientX > opts.edge) return;
      if (opts.handle && !(e.target as Element).closest("[data-drag-handle]")) return;
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), d: 0, v: 0, locked: false };
    },
    onPointerMove(e: React.PointerEvent) {
      const g = drag.current;
      if (!g || g.id !== e.pointerId) return;
      const along = opts.axis === "x" ? e.clientX - g.x : e.clientY - g.y;
      const across = opts.axis === "x" ? e.clientY - g.y : e.clientX - g.x;
      if (!g.locked) {
        // El otro eje gana: es un desplazamiento normal y no lo tocamos.
        if (Math.abs(across) > LOCK && Math.abs(across) > Math.abs(along)) return end();
        if (along < LOCK) return;
        g.locked = true;
        try {
          ref.current?.setPointerCapture?.(e.pointerId);
        } catch {
          // Sin captura el gesto sigue: solo se pierde si el dedo sale del elemento.
        }
      }
      // Solo hacia la derecha o hacia abajo, con resistencia pasado el umbral si no sale.
      const limit = size() * (opts.at ?? DISMISS_AT);
      let d = Math.max(0, along - LOCK);
      if (opts.stay && d > limit) d = limit + (d - limit) * 0.25;
      const now = performance.now();
      const dt = now - g.t;
      // Media suavizada: un movimiento suelto no decide el gesto.
      if (dt > 0) g.v = g.v * 0.4 + ((d - g.d) / dt) * 0.6;
      g.d = d;
      g.t = now;
      set(d);
      opts.onProgress?.(Math.min(1, d / limit));
    },
    onPointerUp(e: React.PointerEvent) {
      const g = drag.current;
      if (!g || g.id !== e.pointerId) return;
      const was = g.d;
      // Si el dedo llevaba un rato quieto al soltar, no hubo golpe.
      const velocity = performance.now() - g.t > 100 ? 0 : g.v;
      end();
      if (!g.locked) return;
      draggedAt.current = performance.now();
      const limit = size() * (opts.at ?? DISMISS_AT);
      const go = was >= limit || (velocity > FLICK && was > limit * 0.5);
      if (!go) return set(0, calm() ? 0 : BACK_MS);
      haptic.impact(opts.stay ? "medium" : "light");
      if (opts.stay) {
        set(0, calm() ? 0 : BACK_MS);
        opts.onDismiss();
        return;
      }
      // Sale entero y, ya fuera, se cierra; el estilo se quita después (si el elemento sigue ahí,
      // su CSS ya lo tiene escondido).
      set(size(), calm() ? 0 : OUT_MS);
      setTimeout(
        () => {
          opts.onDismiss();
          requestAnimationFrame(clear);
        },
        calm() ? 0 : OUT_MS,
      );
    },
    onPointerCancel() {
      if (drag.current?.locked) set(0, BACK_MS);
      end();
    },
    /** Descarta el clic que el navegador manda justo al soltar un arrastre. */
    onClickCapture(e: React.MouseEvent) {
      if (performance.now() - draggedAt.current > 400) return;
      draggedAt.current = 0;
      e.preventDefault();
      e.stopPropagation();
    },
  };
}

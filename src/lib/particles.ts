// Partículas con física (monedas, chispas) para las celebraciones.
// Son nodos efímeros que GSAP crea, anima y borra: React no los conoce ni los controla.

import gsap from "gsap";
import { Physics2DPlugin } from "gsap/Physics2DPlugin";

gsap.registerPlugin(Physics2DPlugin);

export interface BurstOptions {
  /** Capa (position: relative/absolute) donde se pintan las partículas. */
  layer: HTMLElement;
  /** Origen, relativo a la capa. */
  x: number;
  y: number;
  count: number;
  /** "coin" (moneda que gira) o "spark" (rombo de luz). */
  kind: "coin" | "spark" | "star";
  /** Color CSS de las chispas (var(--r-epic)…). Las monedas son siempre doradas. */
  color?: string;
  velocity?: [number, number];
  /** Ángulos en grados: -90 es hacia arriba. */
  angle?: [number, number];
  gravity?: number;
  duration?: [number, number];
  size?: [number, number];
  /** Rotación aleatoria de la dispersión inicial, para que no salgan todas del mismo punto. */
  spread?: number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Lanza `count` partículas y devuelve su línea de tiempo (se puede añadir a otra). */
export function burst(o: BurstOptions): gsap.core.Timeline {
  const tl = gsap.timeline({ onComplete: () => nodes.forEach((n) => n.remove()) });
  const nodes: HTMLElement[] = [];
  const [vMin, vMax] = o.velocity ?? [200, 420];
  const [aMin, aMax] = o.angle ?? [-150, -30];
  const [dMin, dMax] = o.duration ?? [0.9, 1.5];
  const [sMin, sMax] = o.size ?? (o.kind === "coin" ? [12, 18] : [4, 9]);

  for (let i = 0; i < o.count; i++) {
    const el = document.createElement("span");
    el.className = `fx-${o.kind}`;
    const size = rand(sMin, sMax);
    el.style.width = el.style.height = `${size}px`;
    el.style.left = `${o.x - size / 2 + rand(-(o.spread ?? 0), o.spread ?? 0)}px`;
    el.style.top = `${o.y - size / 2}px`;
    if (o.color) el.style.setProperty("--fx", o.color);
    o.layer.appendChild(el);
    nodes.push(el);

    const dur = rand(dMin, dMax);
    const delay = rand(0, 0.12);
    tl.to(
      el,
      {
        physics2D: { velocity: rand(vMin, vMax), angle: rand(aMin, aMax), gravity: o.gravity ?? 900 },
        rotation: rand(-360, 360),
        duration: dur,
        ease: "none",
      },
      delay,
    ).to(el, { opacity: 0, duration: dur * 0.35, ease: "power1.in" }, delay + dur * 0.65);

    // Las monedas giran sobre sí mismas: el ancho oscila como una moneda que da vueltas.
    if (o.kind === "coin") tl.to(el, { scaleX: 0.15, duration: rand(0.12, 0.2), repeat: Math.ceil(dur / 0.15), yoyo: true, ease: "sine.inOut" }, delay);
  }
  return tl;
}

/** Centro de `el` en coordenadas de `layer`. */
export function centerIn(layer: HTMLElement, el: Element) {
  const a = layer.getBoundingClientRect();
  const b = el.getBoundingClientRect();
  return { x: b.left - a.left + b.width / 2, y: b.top - a.top + b.height / 2 };
}

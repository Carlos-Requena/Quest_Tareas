// Efectos de celebración: partículas con física (monedas, chispas, estrellas) y
// sacudidas de la interfaz. Las partículas son nodos efímeros que GSAP crea, anima
// y borra: React no los conoce ni los controla.
//
// Con «reducir movimiento» activado en el sistema, las sacudidas desaparecen y las
// partículas se reducen a un tercio.

import gsap from "gsap";
import { Physics2DPlugin } from "gsap/Physics2DPlugin";

gsap.registerPlugin(Physics2DPlugin);

/** El sistema pide reducir el movimiento (accesibilidad). */
export const calm = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

type Range = [number, number];
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = (v: number | Range) => (typeof v === "number" ? v : rand(v[0], v[1]));
const amount = (n: number) => (calm() ? Math.ceil(n / 3) : n);

/**
 * - coin: moneda dorada que gira.
 * - spark: rombo de luz.
 * - star: estrella de cuatro puntas.
 * - glow: punto de luz difuso (polvo, ascuas); el más barato de pintar.
 */
export type ParticleKind = "coin" | "spark" | "star" | "glow";

function spawn(layer: HTMLElement, kind: ParticleKind, size: number, x: number, y: number, color?: string) {
  const el = document.createElement("span");
  el.className = `fx-${kind}`;
  el.style.width = el.style.height = `${size}px`;
  el.style.left = `${x - size / 2}px`;
  el.style.top = `${y - size / 2}px`;
  if (color) el.style.setProperty("--fx", color);
  layer.appendChild(el);
  return el;
}

const defaultSize = (kind: ParticleKind): Range => (kind === "coin" ? [12, 18] : kind === "glow" ? [6, 14] : [4, 9]);

export interface BurstOptions {
  /** Capa (position: relative/absolute/fixed) donde se pintan las partículas. */
  layer: HTMLElement;
  /** Origen relativo a la capa: un punto o un intervalo (para lluvias). */
  x: number | Range;
  y: number | Range;
  count: number;
  kind: ParticleKind;
  /** Color CSS (var(--r-epic)…). Las monedas son siempre doradas. */
  color?: string;
  velocity?: Range;
  /** Ángulos en grados: -90 es hacia arriba, 90 hacia abajo. */
  angle?: Range;
  /** Gravedad en px/s²; negativa, las partículas suben (ascuas). */
  gravity?: number;
  duration?: Range;
  size?: Range;
  /** Dispersión horizontal del punto de salida. */
  spread?: number;
  /** Retraso de cada partícula, para que salgan escalonadas. */
  delay?: Range;
}

/** Lanza partículas con física y devuelve su línea de tiempo (se puede añadir a otra). */
export function burst(o: BurstOptions): gsap.core.Timeline {
  const nodes: HTMLElement[] = [];
  const tl = gsap.timeline({ onComplete: () => nodes.forEach((n) => n.remove()) });
  const [vMin, vMax] = o.velocity ?? [200, 420];
  const [aMin, aMax] = o.angle ?? [-150, -30];
  const [dMin, dMax] = o.duration ?? [0.9, 1.5];
  const [sMin, sMax] = o.size ?? defaultSize(o.kind);
  const [lMin, lMax] = o.delay ?? [0, 0.12];

  for (let i = 0, n = amount(o.count); i < n; i++) {
    const spread = o.spread ?? 0;
    const el = spawn(o.layer, o.kind, rand(sMin, sMax), pick(o.x) + rand(-spread, spread), pick(o.y), o.color);
    nodes.push(el);
    const dur = rand(dMin, dMax);
    const delay = rand(lMin, lMax);
    tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.06 }, delay)
      .to(
        el,
        {
          physics2D: { velocity: rand(vMin, vMax), angle: rand(aMin, aMax), gravity: o.gravity ?? 900 },
          rotation: rand(-360, 360),
          duration: dur,
          ease: "none",
        },
        delay,
      )
      .to(el, { opacity: 0, duration: dur * 0.35, ease: "power1.in" }, delay + dur * 0.65);
    // Las monedas giran sobre sí mismas: el ancho oscila como una moneda que da vueltas.
    if (o.kind === "coin") {
      tl.to(el, { scaleX: 0.15, duration: rand(0.12, 0.2), repeat: Math.ceil(dur / 0.15), yoyo: true, ease: "sine.inOut" }, delay);
    }
  }
  return tl;
}

export interface ImplodeOptions {
  layer: HTMLElement;
  x: number;
  y: number;
  count: number;
  /** Distancia desde la que llegan las partículas. */
  radius: Range;
  kind?: ParticleKind;
  color?: string;
  duration?: Range;
  size?: Range;
  delay?: Range;
}

/** Partículas que llegan desde un anillo hasta el centro: energía que se concentra. */
export function implode(o: ImplodeOptions): gsap.core.Timeline {
  const nodes: HTMLElement[] = [];
  const tl = gsap.timeline({ onComplete: () => nodes.forEach((n) => n.remove()) });
  const kind = o.kind ?? "spark";
  const [sMin, sMax] = o.size ?? defaultSize(kind);
  const [dMin, dMax] = o.duration ?? [0.4, 0.7];
  const [lMin, lMax] = o.delay ?? [0, 0.15];
  for (let i = 0, n = amount(o.count); i < n; i++) {
    const el = spawn(o.layer, kind, rand(sMin, sMax), o.x, o.y, o.color);
    nodes.push(el);
    const a = Math.random() * Math.PI * 2;
    const r = rand(o.radius[0], o.radius[1]);
    const d = rand(dMin, dMax);
    const delay = rand(lMin, lMax);
    tl.fromTo(el, { x: Math.cos(a) * r, y: Math.sin(a) * r, scale: 1.3, opacity: 0 }, { x: 0, y: 0, scale: 0.2, duration: d, ease: "power3.in" }, delay)
      .to(el, { opacity: 1, duration: d * 0.35 }, delay)
      .to(el, { opacity: 0, duration: d * 0.15 }, delay + d * 0.85);
  }
  return tl;
}

export interface TwinkleOptions {
  layer: HTMLElement;
  x: Range;
  y: Range;
  count: number;
  color?: string;
  size?: Range;
  delay?: Range;
}

/** Estrellitas que aparecen, giran y se apagan en el sitio: el «brillo» que queda en el aire. */
export function twinkle(o: TwinkleOptions): gsap.core.Timeline {
  const nodes: HTMLElement[] = [];
  const tl = gsap.timeline({ onComplete: () => nodes.forEach((n) => n.remove()) });
  const [sMin, sMax] = o.size ?? [8, 16];
  const [lMin, lMax] = o.delay ?? [0, 1.2];
  for (let i = 0, n = amount(o.count); i < n; i++) {
    const el = spawn(o.layer, "star", rand(sMin, sMax), pick(o.x), pick(o.y), o.color);
    nodes.push(el);
    const d = rand(0.45, 0.8);
    tl.fromTo(el, { scale: 0, rotation: 0, opacity: 1 }, { scale: 1, rotation: 90, duration: d / 2, ease: "power2.out" }, rand(lMin, lMax)).to(el, {
      scale: 0,
      rotation: 180,
      duration: d / 2,
      ease: "power2.in",
    });
  }
  return tl;
}

/** Sacudida que se apaga: la interfaz «encaja» el golpe. Devuelve una línea de tiempo vacía si no procede. */
export function quake(target: Element | null | undefined, amp: number, dur = 0.45): gsap.core.Timeline {
  const tl = gsap.timeline();
  if (!target || amp <= 0 || calm()) return tl;
  const n = Math.max(4, Math.round(dur / 0.035));
  const keyframes = Array.from({ length: n }, (_, i) => {
    const k = (1 - i / n) ** 1.5;
    return { x: rand(-1, 1) * amp * k, y: rand(-1, 1) * amp * k * 0.7, rotation: rand(-1, 1) * amp * k * 0.06, duration: dur / n };
  });
  return tl.to(target, { keyframes: [...keyframes, { x: 0, y: 0, rotation: 0, duration: 0.05 }] });
}

/**
 * Temblor que va a más (de `from` a `to` px): la tensión antes de un golpe.
 * `rotate`: grados de giro por px de temblor. `vertical: false` deja libre `y` para otra animación.
 */
export function tremble(
  target: Element | null | undefined,
  dur: number,
  from: number,
  to: number,
  { rotate = 0, vertical = true }: { rotate?: number; vertical?: boolean } = {},
): gsap.core.Timeline {
  const tl = gsap.timeline();
  if (!target || calm()) return tl;
  const n = Math.max(4, Math.round(dur / 0.04));
  const keyframes = Array.from({ length: n }, (_, i) => {
    const a = from + (to - from) * (i / n);
    const s = i % 2 ? 1 : -1;
    return { x: s * a * rand(0.6, 1), ...(vertical ? { y: rand(-0.4, 0.4) * a } : {}), rotation: s * a * rotate, duration: dur / n };
  });
  const rest = vertical ? { x: 0, y: 0, rotation: 0 } : { x: 0, rotation: 0 };
  return tl.to(target, { keyframes: [...keyframes, { ...rest, duration: 0.03 }] });
}

/** Centro de `el` en coordenadas de `layer`. */
export function centerIn(layer: HTMLElement, el: Element) {
  const a = layer.getBoundingClientRect();
  const b = el.getBoundingClientRect();
  return { x: b.left - a.left + b.width / 2, y: b.top - a.top + b.height / 2 };
}

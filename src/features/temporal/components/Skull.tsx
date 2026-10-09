import { memo, useId, type CSSProperties } from "react";

// Calavera roja y brillante, como las de la imagen de referencia. Los colores salen
// de variables CSS (--sk-hi, --sk-mid, --sk-lo, --sk-deep): la clase `.skull-gold`
// las cambia por oro cuando el encargo se cumple.

const HEAD =
  "M32 5.5C17.6 5.5 8.6 15.8 8.6 28.6c0 8 3.9 13.4 9.2 16.4v6.6c0 4.2 3.6 6.9 7.8 6.9h12.8c4.2 0 7.8-2.7 7.8-6.9V45c5.3-3 9.2-8.4 9.2-16.4C55.4 15.8 46.4 5.5 32 5.5Z";
const EYES =
  "M16.6 30.2c0-5.4 5.3-7.6 9.4-5.2 3.4 2 3.6 7.2.6 10.2-3.4 3.2-10 1.6-10-5ZM47.4 30.2c0-5.4-5.3-7.6-9.4-5.2-3.4 2-3.6 7.2-.6 10.2 3.4 3.2 10 1.6 10-5Z";
const NOSE = "M32 36.2l-3.6 7.2c2.3 1.4 4.9 1.4 7.2 0Z";
const TEETH = "M21.2 48.4c7 2.6 14.6 2.6 21.6 0M26.4 49.6v7.4M30.8 50.2v7.6M35.2 50.2v7.6M39.6 49.4v7.4";
const BUMPS: [number, number, number][] = [
  [22, 13, 3.2],
  [41, 11.5, 2.6],
  [47, 21, 2.2],
  [14.5, 22, 2],
  [33, 9, 2.4],
];

/** Con memo: sale en cada cartel, ficha y tarjeta, y su dibujo solo depende de sus props. */
export const Skull = memo(function Skull({ className = "", style }: { className?: string; style?: CSSProperties }) {
  const id = `sk${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg viewBox="0 0 64 64" className={`skull ${className}`} style={style} aria-hidden>
      <defs>
        <radialGradient id={id} cx="36%" cy="24%" r="80%">
          <stop offset="0" style={{ stopColor: "var(--sk-hi)" }} />
          <stop offset="0.42" style={{ stopColor: "var(--sk-mid)" }} />
          <stop offset="1" style={{ stopColor: "var(--sk-lo)" }} />
        </radialGradient>
      </defs>
      <path d={HEAD} fill={`url(#${id})`} stroke="var(--sk-lo)" strokeWidth="1.2" />
      {BUMPS.map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="var(--sk-hi)" opacity="0.28" />
      ))}
      <path d={EYES} fill="var(--sk-deep)" />
      <path d={NOSE} fill="var(--sk-deep)" />
      <path d={TEETH} fill="none" stroke="var(--sk-deep)" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="21" cy="14.5" rx="6.5" ry="3.4" transform="rotate(-28 21 14.5)" fill="#fff" opacity="0.5" />
      <circle cx="44" cy="16" r="1.6" fill="#fff" opacity="0.45" />
    </svg>
  );
});

/** Mancha de tinta que deja una calavera al estamparse (animación de «cartel clavado»). */
export function InkSplat({ className = "", seed = 0 }: { className?: string; seed?: number }) {
  const drops = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2 + seed * 1.7;
    const r = 30 + ((i * 7 + seed * 3) % 5) * 3.4;
    return { cx: 50 + Math.cos(a) * r, cy: 50 + Math.sin(a) * r, r: 2 + ((i + seed) % 3) * 1.6 };
  });
  return (
    <svg viewBox="0 0 100 100" className={`splat ${className}`} aria-hidden>
      <path
        d="M50 22c9 0 13 7 20 8s12 9 9 17 2 13-4 19-14 4-21 9-15 1-20-5-13-8-12-17 4-12 10-19 9-12 18-12Z"
        fill="var(--sk-mid)"
      />
      {drops.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill="var(--sk-mid)" />
      ))}
    </svg>
  );
}

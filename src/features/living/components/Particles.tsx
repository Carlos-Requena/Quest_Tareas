import { memo, type CSSProperties } from "react";
import type { Particles as Kind } from "../model";

/** Cuántas partículas de cada clase (las que suben o caen necesitan más para no verse vacías). */
const COUNT: Record<Exclude<Kind, "none">, number> = { dust: 16, sparkles: 12, petals: 14, embers: 18, snow: 20 };

/**
 * Partículas alrededor del personaje, solo con CSS: cada una con su posición, retraso,
 * duración y tamaño fijos (salen del índice, sin azar), así no saltan al volver a pintar.
 */
export const Particles = memo(function Particles({ kind }: { kind: Kind }) {
  if (kind === "none") return null;
  const n = COUNT[kind];
  return (
    <div className={`lv-fx is-${kind}`}>
      {Array.from({ length: n }, (_, i) => {
        // Reparto casi uniforme: cada una en su franja, desplazada un poco.
        const x = ((i * 61 + 17) % 100) * 0.9 + 5;
        const y = ((i * 37 + 23) % 100) * 0.8 + 6;
        const style = {
          "--x": `${x}%`,
          "--y": `${y}%`,
          "--d": `${-((i * 1.7) % 11).toFixed(2)}s`,
          "--s": `${(6 + ((i * 7) % 9)).toFixed(1)}s`,
          "--k": (0.55 + ((i * 13) % 10) / 14).toFixed(2),
          "--dx": `${((i % 2 ? 1 : -1) * (10 + ((i * 11) % 30))).toFixed(0)}px`,
        } as CSSProperties;
        return <i key={i} style={style} />;
      })}
    </div>
  );
});

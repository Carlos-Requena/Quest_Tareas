import type { CSSProperties, ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { RARITY_META, rarityTier } from "../../items/model";
import type { ArmorSlot, GearDef } from "../../merchant/model";

/**
 * Formas de cada pieza sobre el muñeco (viewBox 240 × 320). Cada pieza se pinta con el
 * color de su rareza y un brillo metálico encima, así cualquier pieza queda bien puesta
 * aunque su imagen sea de otro estilo. La imagen de la pieza se ve en su ranura.
 */
const PIECES: Record<ArmorSlot, { paths: string[]; detail?: string[] }> = {
  cape: {
    paths: ["M90 132Q120 124 150 132L180 276Q120 292 60 276Z"],
    detail: ["M100 140L84 272", "M140 140L156 272", "M120 136V284"],
  },
  feet: {
    paths: [
      "M90 232h24l2 32q-14 12-34 8-6-2-4-8l12-6z",
      "M126 232h24l12 26 12 6q2 6-4 8-20 4-34-8z",
    ],
    detail: ["M90 240h24", "M126 240h24"],
  },
  body: {
    paths: ["M86 134Q120 125 154 134L152 180Q120 190 88 180Z", "M70 140a18 13 0 0 1 34-6l-4 12a16 10 0 0 0-26 4z", "M170 140a18 13 0 0 0-34-6l4 12a16 10 0 0 1 26 4z"],
    detail: ["M120 132V184", "M96 160Q120 168 144 160"],
  },
  hands: {
    paths: ["M66 166l18-2-2 26-8 14H62l-4-14z", "M174 166l-18-2 2 26 8 14h12l4-14z"],
    detail: ["M64 176h18", "M176 176h-18"],
  },
  head: {
    paths: ["M78 92C76 40 164 40 162 92v8h-12v-10c0-20-60-20-60 0v10H78z"],
    detail: ["M84 82h72", "M120 48v34"],
  },
  amulet: {
    paths: ["M120 142l9 10-9 11-9-11z"],
  },
  shield: {
    paths: ["M150 150h54v30q0 34-27 50-27-16-27-50z"],
    detail: ["M177 158v64", "M156 182h42"],
  },
  weapon: {
    paths: ["M68 186l-34-86 4-10 8 6 32 86z", "M54 188l30-12 3 7-30 12z", "M66 194l6-2 6 16-6 2z"],
    detail: ["M58 176L40 104"],
  },
};

interface Props {
  /** Lo que lleva puesto, por ranura (solo armadura). */
  worn: Partial<Record<ArmorSlot, GearDef>>;
  /** Ranura resaltada (ratón o teclado): si está vacía, se ve dónde iría la pieza. */
  highlight?: ArmorSlot;
}

/** El muñeco que te representa, con su armadura puesta. */
export function Doll({ worn, highlight }: Props) {
  return (
    <svg className="doll" viewBox="0 0 240 320" role="img" aria-hidden>
      <defs>
        {/* Brillo metálico común a todas las piezas: luz arriba y sombra abajo. */}
        <linearGradient id="doll-sheen" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.38" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="0.62" stopColor="#000" stopOpacity="0.05" />
          <stop offset="1" stopColor="#000" stopOpacity="0.45" />
        </linearGradient>
        <radialGradient id="doll-floor" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.55" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="120" cy="286" rx="78" ry="12" fill="url(#doll-floor)" />

      <g className="doll-body">
        {/* La capa va detrás de todo. */}
        <Piece slot="cape" gear={worn.cape} highlight={highlight} />

        {/* Pelo de atrás */}
        <path className="doll-hair" d="M78 98C72 44 168 44 162 98v26q-8 8-16-2H94q-8 10-16 2z" />
        {/* Piernas y zapatos */}
        <path className="doll-legs" d="M104 196l-2 66M136 196l2 66" />
        <ellipse className="doll-shoe" cx="100" cy="268" rx="15" ry="8" />
        <ellipse className="doll-shoe" cx="140" cy="268" rx="15" ry="8" />
        <Piece slot="feet" gear={worn.feet} highlight={highlight} />

        {/* Túnica, cinturón y brazos */}
        <path className="doll-tunic" d="M88 132Q120 124 152 132L160 198Q120 208 80 198Z" />
        <path className="doll-belt" d="M83 186Q120 194 157 186l1 10Q120 204 82 196z" />
        <rect className="doll-buckle" x="114" y="187" width="12" height="11" rx="1.5" />
        <path className="doll-arm" d="M90 138Q74 162 72 190M150 138Q166 162 168 190" />
        <circle className="doll-skin" cx="72" cy="196" r="9" />
        <circle className="doll-skin" cx="168" cy="196" r="9" />
        <Piece slot="body" gear={worn.body} highlight={highlight} />
        <Piece slot="hands" gear={worn.hands} highlight={highlight} />

        {/* Cuello, cara, flequillo y ojos */}
        <rect className="doll-skin-lo" x="112" y="116" width="16" height="16" rx="4" />
        <circle className="doll-skin" cx="120" cy="86" r="38" />
        <path className="doll-hair" d="M82 88C84 46 156 44 158 88c-10-12-20-12-28-20-8 10-24 10-34 4-4 8-8 12-14 16z" />
        <ellipse className="doll-eye" cx="105" cy="96" rx="3.4" ry="4.4" />
        <ellipse className="doll-eye" cx="135" cy="96" rx="3.4" ry="4.4" />
        <ellipse className="doll-blush" cx="97" cy="106" rx="6" ry="3" />
        <ellipse className="doll-blush" cx="143" cy="106" rx="6" ry="3" />
        <path className="doll-mouth" d="M114 110q6 4 12 0" />
        <Piece slot="head" gear={worn.head} highlight={highlight} />

        {/* Delante de todo: amuleto, escudo y arma */}
        <path className="doll-chain" d="M106 128q14 22 28 0" opacity={worn.amulet ? 1 : 0} />
        <Piece slot="amulet" gear={worn.amulet} highlight={highlight} />
        <Piece slot="shield" gear={worn.shield} highlight={highlight} />
        <Piece slot="weapon" gear={worn.weapon} highlight={highlight} />
      </g>
    </svg>
  );
}

/** Una pieza: aparece con un pequeño golpe al ponérsela; vacía y resaltada, se ve su contorno. */
function Piece({ slot, gear, highlight }: { slot: ArmorSlot; gear?: GearDef; highlight?: ArmorSlot }) {
  const shape = PIECES[slot];
  let content: ReactNode = null;
  if (gear) {
    const tier = rarityTier(gear.rarity);
    content = (
      <motion.g
        key={gear.id}
        className={`dp dp-${slot} dp-t${tier} ${highlight === slot ? "is-hl" : ""}`}
        style={{ "--rc": RARITY_META[gear.rarity].color } as CSSProperties}
        initial={{ opacity: 0, y: -16, scale: 1.08 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ type: "spring", stiffness: 420, damping: 22 }}
      >
        {shape.paths.map((d, i) => (
          <path key={i} className="dp-base" d={d} />
        ))}
        {shape.paths.map((d, i) => (
          <path key={`s${i}`} className="dp-sheen" d={d} fill="url(#doll-sheen)" />
        ))}
        {shape.detail?.map((d, i) => (
          <path key={`d${i}`} className="dp-detail" d={d} />
        ))}
      </motion.g>
    );
  } else if (highlight === slot) {
    content = (
      <g key="ghost" className="dp-ghost">
        {shape.paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    );
  }
  return <AnimatePresence>{content}</AnimatePresence>;
}

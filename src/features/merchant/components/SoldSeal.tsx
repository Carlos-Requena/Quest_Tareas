import { useLayoutEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { sfx } from "../../../lib/sfx";
import { burst, centerIn, quake } from "../../../lib/fx";
import { RARITIES, RARITY_META } from "../../items/model";

/** Una compra recién hecha: dispara el sello. `tier` es la rareza (0 común … 5 legendaria). */
export interface Sale {
  key: number;
  tier: number;
}

/**
 * Sello rojo de «vendido» que Hu Tao estampa sobre el escaparate, con lluvia de monedas.
 * Cuanto más rara la pieza, más golpe: sacudida, fanfarria y estrellas de su color.
 * GSAP controla su visibilidad (la opacidad inicial está en el CSS, no en React).
 */
export function SoldSeal({ sale, stage }: { sale?: Sale; stage: RefObject<HTMLDivElement | null> }) {
  const seal = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = seal.current;
    const layer = stage.current;
    if (!sale || !el || !layer) return;
    const color = RARITY_META[RARITIES[sale.tier] ?? "common"].color;
    const tl = gsap.timeline();
    tl.set(el, { opacity: 0, scale: 2.8, rotation: -26 })
      .to(el, { opacity: 1, scale: 1, rotation: -9, duration: 0.24, ease: "power4.in" })
      .add(() => {
        sfx.stamp();
        sfx.coins(10 + sale.tier * 3);
        if (sale.tier >= 3) sfx.fanfare(sale.tier);
        const { x, y } = centerIn(layer, el);
        burst({ layer, x, y, count: 22 + sale.tier * 6, kind: "coin", velocity: [220, 520], angle: [-165, -15], gravity: 1100 });
        if (sale.tier >= 3)
          burst({ layer, x, y, count: 10 + sale.tier * 4, kind: "star", color, velocity: [120, 360], angle: [-180, 0], gravity: 260, duration: [1.1, 1.8] });
        quake(layer, 5 + sale.tier * 2);
      })
      .to(el, { scale: 1.06, duration: 0.08, yoyo: true, repeat: 1, ease: "power1.out" })
      .to(el, { opacity: 0, duration: 0.6, ease: "power1.in" }, "+=1.5");
    return () => {
      tl.kill();
    };
  }, [sale, stage]);

  return (
    <div ref={seal} className="ht-seal" aria-hidden>
      <span>SOLD</span>
    </div>
  );
}

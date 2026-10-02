import { useImperativeHandle, useLayoutEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import gsap from "gsap";
import { useGame, type ClearResult } from "../../../store/game";
import { sfx } from "../../../lib/sfx";
import { burst, centerIn } from "../../../lib/particles";
import { RARITY_META, rarityTier, type ItemDef, type Rarity } from "../model";
import { ItemTile, rarityStyle } from "./ItemTile";

/** Lo que el overlay de «Quest Clear» puede pedirle al cofre. */
export interface ChestHandle {
  /** Queda algo por hacer (aparecer, abrirse o terminar de abrirse). */
  pending(): boolean;
  /** Siguiente paso: abrir el cofre o, si se está abriendo, saltar al final. */
  advance(): void;
  /** El cofre cae sobre la mesa y espera el clic. */
  appear(): void;
}

interface Content {
  item: ItemDef;
  rarity: Rarity;
  isNew: boolean;
}

/**
 * Contenido del cofre: el objeto garantizado y después los drops.
 * NEW marca la primera unidad de lo que no estaba en el inventario antes de reportar.
 */
export function chestContents(clear: ClearResult, items: Map<string, ItemDef>): Content[] {
  const seen = new Set(Object.keys(clear.before.inventory).filter((id) => clear.before.inventory[id] > 0));
  const isNew = (id: string) => (seen.has(id) ? false : (seen.add(id), true));
  const out: Content[] = [];
  const g = clear.guaranteed ? items.get(clear.guaranteed) : undefined;
  if (g) out.push({ item: g, rarity: g.rarity, isNew: isNew(g.id) });
  for (const d of clear.drops) {
    const item = items.get(d.itemId);
    if (item) out.push({ item, rarity: d.rarity, isNew: isNew(d.itemId) });
  }
  return out;
}

type Phase = "hidden" | "appearing" | "closed" | "opening" | "open";

const EPIC = rarityTier("epic");
const MYTHIC = rarityTier("mythic");

/**
 * Cofre del botín. Brilla con el color de la mejor rareza que contiene (como el
 * meteoro de un gacha) y se abre con un clic: tiembla, salta la tapa, sale un haz
 * de luz, monedas y chispas del color de cada objeto, y los objetos vuelan a su sitio.
 */
export function LootChest({ clear, onOpened, ref }: { clear: ClearResult; onOpened(): void; ref?: React.Ref<ChestHandle> }) {
  const { t } = useTranslation();
  // Se fija al reportar: si el store se recalcula mientras tanto, el cofre no se reinicia.
  const contents = useMemo(() => chestContents(clear, useGame.getState().state.items), [clear]);
  const top = contents.reduce((m, c) => Math.max(m, rarityTier(c.rarity)), 0);
  const topColor = RARITY_META[contents.find((c) => rarityTier(c.rarity) === top)?.rarity ?? "common"].color;

  const root = useRef<HTMLDivElement>(null);
  const ctx = useRef<gsap.Context>(undefined);
  const phase = useRef<Phase>("hidden");
  const appearTl = useRef<gsap.core.Timeline>(undefined);
  const openTl = useRef<gsap.core.Timeline>(undefined);
  const idle = useRef<gsap.core.Timeline>(undefined);
  const onOpenedRef = useRef(onOpened);
  onOpenedRef.current = onOpened;

  useLayoutEffect(() => {
    if (!contents.length || !root.current) return;
    phase.current = "hidden";
    ctx.current = gsap.context(() => {
      gsap.set(root.current, { opacity: 0 });
      gsap.set(".chest-item", { opacity: 0 });
      gsap.set(".chest-rays, .chest-beam, .chest-flash, .chest-ring, .chest-aura", { opacity: 0 });
    }, root);
    const fx = root.current.querySelector(".chest-fx");
    return () => {
      ctx.current?.revert();
      fx?.replaceChildren();
    };
  }, [contents]);

  function startIdle() {
    ctx.current?.add(() => {
      // Un saltito cada poco, para que apetezca abrirlo.
      idle.current = gsap
        .timeline({ repeat: -1, repeatDelay: 1.1 })
        .to(".chest-body", { y: -7, duration: 0.16, ease: "power2.out" })
        .to(".chest-body", { keyframes: [{ rotation: -3 }, { rotation: 3 }, { rotation: -2 }, { rotation: 0 }], duration: 0.3 }, "<")
        .to(".chest-body", { y: 0, duration: 0.22, ease: "bounce.out" }, "-=0.08")
        .fromTo(".chest-seam", { opacity: 0.35 }, { opacity: 0.9, duration: 0.3, yoyo: true, repeat: 1 }, 0)
        .fromTo(".chest-aura", { opacity: 0.55, scale: 1 }, { opacity: 0.85, scale: 1.08, duration: 0.6, yoyo: true, repeat: 1, ease: "sine.inOut" }, 0);
    });
  }

  function appear() {
    if (phase.current !== "hidden" || !contents.length) return;
    phase.current = "appearing";
    ctx.current?.add(() => {
      appearTl.current = gsap
        .timeline({
          onComplete: () => {
            phase.current = "closed";
            startIdle();
          },
        })
        .set(root.current, { opacity: 1 })
        .fromTo(".chest-body", { y: -110, opacity: 0, scale: 0.75 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "bounce.out" })
        .add(() => sfx.chestLand(), 0.22)
        .fromTo(".chest-aura", { opacity: 0, scale: 0.5 }, { opacity: 0.6, scale: 1, duration: 0.5 }, 0.25)
        .fromTo(".chest-hint", { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.35 }, 0.45);
    });
  }

  function open() {
    const el = root.current;
    if (!el || phase.current !== "closed") return;
    phase.current = "opening";
    idle.current?.kill();
    const fx = el.querySelector<HTMLElement>(".chest-fx")!;
    const chest = el.querySelector(".chest-body")!;
    const c = centerIn(fx, chest);
    const mouth = { x: c.x, y: c.y - 18 };
    // Cada objeto sale del cofre hacia su hueco: desplazamiento desde el cofre.
    const offsets = [...el.querySelectorAll(".chest-item")].map((it) => {
      const p = centerIn(fx, it);
      return { x: mouth.x - p.x, y: mouth.y - p.y };
    });
    const stage = el.closest(".cl-stage");

    ctx.current?.add(() => {
      const tl = gsap.timeline({
        onComplete: () => {
          phase.current = "open";
          onOpenedRef.current();
        },
      });
      openTl.current = tl;
      tl.to(".chest-hint", { opacity: 0, duration: 0.15 })
        .set(".chest-body", { y: 0, rotation: 0 })
        .add(() => sfx.chestShake())
        // Tres sacudidas cada vez más fuertes mientras la luz se escapa por la rendija.
        .to(".chest-body", {
          keyframes: [3, -3, 0, 0, 5, -5, 0, 0, 7, -7, 4, 0].map((r) => ({ x: r, rotation: r * 0.6, duration: 0.045 })),
        })
        .to(".chest-seam", { opacity: 1, duration: 0.5 }, "<")
        .to(".chest-aura", { opacity: 1, scale: 1.45, duration: 0.5, ease: "power2.in" }, "<")
        .addLabel("pop")
        .add(() => sfx.chestOpen(top), "pop")
        .to(".chest-lid", { y: -34, rotation: -18, scaleY: 0.72, duration: 0.32, ease: "back.out(3)", transformOrigin: "20% 100%" }, "pop")
        .fromTo(".chest-flash", { opacity: 1, scale: 0.3 }, { opacity: 0, scale: 2.6, duration: 0.75, ease: "power2.out" }, "pop")
        .fromTo(".chest-ring", { opacity: 0.9, scale: 0.2 }, { opacity: 0, scale: 3.2, duration: 0.85, ease: "power2.out" }, "pop")
        .fromTo(".chest-beam", { opacity: 0, scaleY: 0 }, { opacity: 1, scaleY: 1, duration: 0.4, ease: "power3.out" }, "pop")
        .add(() => {
          // Fuente de monedas y chispas del color de cada objeto (más cuanto más raro).
          burst({ layer: fx, ...mouth, count: 26, kind: "coin", velocity: [260, 500], angle: [-128, -52], gravity: 1050, spread: 18 });
          for (const it of contents) {
            const tier = rarityTier(it.rarity);
            burst({ layer: fx, ...mouth, count: 8 + tier * 6, kind: "spark", color: RARITY_META[it.rarity].color, velocity: [150, 360 + tier * 50], angle: [-170, -10], gravity: 420, spread: 20 });
          }
          if (top >= MYTHIC) {
            burst({ layer: fx, ...mouth, count: 18, kind: "star", color: topColor, velocity: [80, 260], angle: [-180, 0], gravity: 120, duration: [1.4, 2.2], size: [8, 14] });
          }
          sfx.coins(14);
        }, "pop");

      // Sacudida de pantalla y destello a pantalla completa para mítico y legendario.
      if (top >= MYTHIC && stage) {
        tl.to(stage, { keyframes: [-8, 7, -5, 4, -2, 0].map((x) => ({ x, duration: 0.05 })) }, "pop")
          .fromTo(".chest-screenflash", { opacity: top === rarityTier("legendary") ? 0.75 : 0.45 }, { opacity: 0, duration: 0.9, ease: "power2.out" }, "pop");
      }

      contents.forEach((it, i) => {
        const tier = rarityTier(it.rarity);
        const sel = `.chest-item:nth-child(${i + 1})`;
        const at = 0.3 + i * 0.3;
        tl.fromTo(
          sel,
          { x: offsets[i].x, y: offsets[i].y, scale: 0.15, opacity: 0, rotateY: 540 },
          { x: 0, y: 0, scale: 1, opacity: 1, rotateY: 0, duration: 0.75, ease: "back.out(1.5)" },
          `pop+=${at}`,
        )
          .add(() => {
            sfx.reveal(tier);
            const p = centerIn(fx, el.querySelector(`${sel} .iart`) ?? el);
            burst({ layer: fx, ...p, count: 10 + tier * 5, kind: "spark", color: RARITY_META[it.rarity].color, velocity: [90, 220 + tier * 30], angle: [-180, 0], gravity: 260, duration: [0.6, 1.1] });
          }, `pop+=${at + 0.45}`)
          .fromTo(`${sel} .chest-item-glow`, { opacity: 1, scale: 0.3 }, { opacity: 0, scale: tier >= MYTHIC ? 2.8 : 2, duration: tier >= EPIC ? 1 : 0.6, ease: "power2.out" }, `pop+=${at + 0.45}`);
        if (tier >= EPIC) {
          tl.fromTo(`${sel} .chest-rays`, { opacity: 0, scale: 0.4 }, { opacity: 0.9, scale: 1, duration: 0.5 }, `pop+=${at + 0.45}`);
          gsap.to(`${sel} .chest-rays`, { rotation: 360, duration: 9, repeat: -1, ease: "none" });
        }
      });

      tl.to(".chest-body", { y: 30, opacity: 0, scale: 0.85, duration: 0.45, ease: "power2.in" }, `pop+=${0.35 + contents.length * 0.3}`)
        .to(".chest-beam, .chest-aura", { opacity: 0, duration: 0.7 }, "<");
    });
  }

  useImperativeHandle(ref, () => ({
    pending: () => contents.length > 0 && phase.current !== "open",
    appear,
    advance() {
      if (phase.current === "hidden") appear();
      if (phase.current === "appearing") appearTl.current?.progress(1);
      if (phase.current === "closed") open();
      else if (phase.current === "opening") openTl.current?.progress(1);
    },
  }));

  if (!contents.length) return null;

  return (
    <div className="chest-zone" ref={root} style={{ "--rc": topColor } as React.CSSProperties}>
      <span className="chest-screenflash" />
      <span className="chest-aura" />
      <span className="chest-beam" />
      <span className="chest-flash" />
      <span className="chest-ring" />

      <div className="chest-items">
        {contents.map((c, i) => (
          <div key={i} className={`chest-item is-${c.rarity}`} style={rarityStyle(c.item)}>
            {rarityTier(c.rarity) >= EPIC && <span className="chest-rays" />}
            <span className="chest-item-glow" />
            <ItemTile item={c.item} isNew={c.isNew} />
          </div>
        ))}
      </div>

      <button
        type="button"
        className="chest-body"
        aria-label={t("items.clear.openChest")}
        onClick={(e) => {
          e.stopPropagation();
          if (phase.current === "appearing") appearTl.current?.progress(1);
          if (phase.current === "closed") open();
          else if (phase.current === "opening") openTl.current?.progress(1);
        }}
      >
        <ChestSvg />
      </button>
      <p className="chest-hint">{t("items.clear.openChest")}</p>
      <div className="chest-fx" />
    </div>
  );
}

function ChestSvg() {
  return (
    <svg className="chest-svg" viewBox="0 0 140 112" aria-hidden>
      <defs>
        <linearGradient id="chest-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--wood)" />
          <stop offset="1" stopColor="var(--wood-lo)" />
        </linearGradient>
        <linearGradient id="chest-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--gold-hi)" />
          <stop offset="0.5" stopColor="var(--gold)" />
          <stop offset="1" stopColor="var(--gold-lo)" />
        </linearGradient>
        <clipPath id="chest-lid-clip">
          <path d="M14 56 V40 Q14 14 70 14 Q126 14 126 40 V56 Z" />
        </clipPath>
      </defs>

      <g className="chest-base">
        <rect x="14" y="54" width="112" height="48" rx="3" fill="url(#chest-wood)" stroke="var(--gold-lo)" />
        <line x1="14" y1="72" x2="126" y2="72" className="chest-plank" />
        <line x1="14" y1="88" x2="126" y2="88" className="chest-plank" />
        <rect x="30" y="54" width="9" height="48" fill="url(#chest-metal)" />
        <rect x="101" y="54" width="9" height="48" fill="url(#chest-metal)" />
        <rect x="12" y="99" width="116" height="7" rx="2" fill="url(#chest-metal)" />
        <rect x="14" y="54" width="112" height="5" fill="url(#chest-metal)" />
      </g>

      <rect className="chest-seam" x="16" y="52" width="108" height="4" rx="2" />

      <g className="chest-lid">
        <path d="M14 56 V40 Q14 14 70 14 Q126 14 126 40 V56 Z" fill="url(#chest-wood)" stroke="var(--gold-lo)" />
        <g clipPath="url(#chest-lid-clip)">
          <line x1="14" y1="34" x2="126" y2="34" className="chest-plank" />
          <rect x="30" y="10" width="9" height="46" fill="url(#chest-metal)" />
          <rect x="101" y="10" width="9" height="46" fill="url(#chest-metal)" />
        </g>
        <rect x="12" y="50" width="116" height="6" rx="2" fill="url(#chest-metal)" />
      </g>

      <g className="chest-lock">
        <rect x="61" y="46" width="18" height="22" rx="3" fill="url(#chest-metal)" stroke="var(--gold-lo)" />
        <circle cx="70" cy="55" r="3" className="chest-keyhole" />
        <rect x="68.8" y="56" width="2.4" height="7" className="chest-keyhole" />
      </g>
    </svg>
  );
}

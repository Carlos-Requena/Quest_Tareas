import { useImperativeHandle, useLayoutEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import gsap from "gsap";
import { useGame, type ClearResult } from "../../../store/game";
import { sfx } from "../../../lib/sfx";
import { burst, calm, centerIn, implode, quake, tremble, twinkle } from "../../../lib/fx";
import { RARITIES, RARITY_META, rarityTier, type ItemDef, type Rarity } from "../model";
import { ItemTile, rarityStyle } from "./ItemTile";
import { useIsPhone } from "../../mobile";

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

const RARE = rarityTier("rare");
const EPIC = rarityTier("epic");
const MYTHIC = rarityTier("mythic");
const LEGENDARY = rarityTier("legendary");

/** Duración de la carga, antes del estallido (s). Es igual para todas las rarezas: no delata nada. */
const CHARGE = 1.15;
/** En qué punto de la carga sube el color, según cuántas subidas haya. */
const UP_AT = [[0.6], [0.4, 0.75]];
/** Fuerza de la sacudida (px) al estallar y al caer cada objeto, por rareza (común … legendario). */
const POP_SHAKE = [6, 7, 9, 11, 14, 18];
const LAND_SHAKE = [0, 2, 4, 7, 10, 15];
/** Opacidad del destello a pantalla completa, por rareza. */
const FLASH = [0.35, 0.4, 0.5, 0.6, 0.75, 0.9];
/** Rayos de luz que se escapan por la rendija (grados respecto a la vertical). */
const LEAK_ANGLES = [-74, -42, -14, 14, 42, 74];
/** Un doble clic no debe saltarse la apertura: se puede saltar a partir de este momento (ms). */
const SKIP_AFTER = 900;

const colorOf = (r: Rarity) => RARITY_META[r].color;

/**
 * Cofre del botín, pensado para que abrirlo dé subidón:
 * 1. Cae sobre la mesa y da saltitos, brillando con un color de «aviso» que no delata lo que hay dentro.
 * 2. Al hacer clic, la pantalla se oscurece, el cofre se hincha y tiembla, la luz se escapa por la
 *    rendija y la energía se concentra en él. Si dentro hay algo mejor, el color sube: azul → morado → rojo.
 * 3. Compresión, un instante de pausa y estallido (dorado si hay un legendario): la interfaz vibra,
 *    ondas de choque, rayos, haz de luz, fuente y lluvia de monedas, ascuas y destellos.
 * 4. Cada objeto sale volando y aterriza con un golpe proporcional a su rareza; los épicos o mejores
 *    traen fanfarria, rayos giratorios y un rótulo enorme. Antes de un legendario hay una pausa dorada.
 */
export function LootChest({ clear, onOpened, ref }: { clear: ClearResult; onOpened(): void; ref?: React.Ref<ChestHandle> }) {
  const { t } = useTranslation();
  const phone = useIsPhone();
  // Se fija al reportar: si el store se recalcula mientras tanto, el cofre no se reinicia.
  const contents = useMemo(() => chestContents(clear, useGame.getState().state.items), [clear]);
  const top = contents.reduce((m, c) => Math.max(m, rarityTier(c.rarity)), 0);
  const topRarity = RARITIES[top];
  const topIndex = contents.findIndex((c) => rarityTier(c.rarity) === top);
  // Color de aviso: como mucho azul, para que la subida de rareza sea una sorpresa.
  const teaser = Math.min(top, RARE);
  const upgrades = RARITIES.slice(teaser + 1, top + 1);
  const chargeUps = upgrades.filter((r) => r !== "legendary");

  const root = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const screenFlash = useRef<HTMLSpanElement>(null);
  const screenFx = useRef<HTMLDivElement>(null);
  const banner = useRef<HTMLDivElement>(null);
  const ctx = useRef<gsap.Context>(undefined);
  const phase = useRef<Phase>("hidden");
  const appearTl = useRef<gsap.core.Timeline>(undefined);
  const openTl = useRef<gsap.core.Timeline>(undefined);
  const idle = useRef<gsap.core.Timeline>(undefined);
  const openedAt = useRef(0);
  /** Mientras se salta la animación no suenan efectos ni se lanzan partículas. */
  const skipping = useRef(false);
  const geo = useRef<{ mouth: { x: number; y: number }; floor: number }>(undefined);
  const onOpenedRef = useRef(onOpened);
  onOpenedRef.current = onOpened;

  useLayoutEffect(() => {
    if (!contents.length || !root.current) return;
    phase.current = "hidden";
    ctx.current = gsap.context(() => {
      gsap.set(root.current, { opacity: 0 });
      gsap.set(".chest-item", { opacity: 0 });
      gsap.set(".chest-leak", { opacity: 0, scaleY: 0, rotation: (i: number) => LEAK_ANGLES[i], transformOrigin: "50% 100%" });
    }, root);
    const fx = root.current.querySelector(".chest-fx");
    const scr = screenFx.current;
    return () => {
      ctx.current?.revert();
      fx?.replaceChildren();
      scr?.replaceChildren();
    };
  }, [contents]);

  const layer = () => root.current?.querySelector<HTMLElement>(".chest-fx") ?? null;
  const stageOf = () => root.current?.closest<HTMLElement>(".cl-stage") ?? null;
  const fxOn = () => !skipping.current;

  function startIdle() {
    ctx.current?.add(() => {
      // Un saltito cada poco, con la rendija brillando y motas de luz subiendo: dan ganas de abrirlo.
      idle.current = gsap
        .timeline({ repeat: -1, repeatDelay: 0.9 })
        .to(".chest-body", { y: -8, duration: 0.16, ease: "power2.out" })
        .to(".chest-body", { keyframes: [{ rotation: -4 }, { rotation: 4 }, { rotation: -2 }, { rotation: 0 }], duration: 0.32 }, "<")
        .to(".chest-body", { y: 0, duration: 0.24, ease: "bounce.out" }, "-=0.08")
        .fromTo(".chest-seam", { opacity: 0.35 }, { opacity: 1, duration: 0.25, yoyo: true, repeat: 1 }, 0)
        .fromTo(".chest-aura", { opacity: 0.55, scale: 1 }, { opacity: 0.9, scale: 1.1, duration: 0.6, yoyo: true, repeat: 1, ease: "sine.inOut" }, 0)
        .add(() => {
          const fx = layer();
          const g = geo.current;
          if (fx && g) burst({ layer: fx, x: g.mouth.x, y: g.mouth.y + 14, count: 4, kind: "glow", color: "var(--rc)", velocity: [20, 60], angle: [-115, -65], gravity: -30, duration: [1.2, 1.9], spread: 46 });
        }, 0.1);
    });
  }

  function appear() {
    const el = root.current;
    if (phase.current !== "hidden" || !el || !contents.length) return;
    phase.current = "appearing";
    const fx = layer()!;
    const chest = el.querySelector(".chest-body")!;
    const c = centerIn(fx, chest);
    const h = chest.getBoundingClientRect().height;
    geo.current = { mouth: { x: c.x, y: c.y - 18 }, floor: c.y + h / 2 - 6 };
    const stage = stageOf();

    ctx.current?.add(() => {
      appearTl.current = gsap
        .timeline({
          defaults: { immediateRender: false },
          onComplete: () => {
            phase.current = "closed";
            startIdle();
          },
        })
        .set(el, { opacity: 1 })
        .fromTo(".chest-body", { y: -150, opacity: 0, scale: 0.7, rotation: -10 }, { y: 0, opacity: 1, scale: 1, rotation: 0, duration: 0.7, ease: "bounce.out" }, 0)
        .fromTo(".chest-shadow", { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 0.7, ease: "bounce.out" }, 0)
        // Primer golpe contra la mesa: polvo a los lados y la interfaz encaja el impacto.
        .add(() => {
          if (!fxOn()) return;
          sfx.chestLand();
          const floor = geo.current!.floor;
          for (const side of [-1, 1]) {
            burst({ layer: fx, x: c.x + side * 58, y: floor, count: 8, kind: "glow", color: "var(--muted)", velocity: [50, 140], angle: side < 0 ? [-178, -150] : [-30, -2], gravity: 140, duration: [0.45, 0.8] });
          }
        }, 0.25)
        .add(quake(stage, 4, 0.25), 0.25)
        .fromTo(".chest-aura", { opacity: 0, scale: 0.5 }, { opacity: 0.6, scale: 1, duration: 0.5 }, 0.3)
        .fromTo(".chest-hint", { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.35 }, 0.5);
    });
  }

  /** Sube el color del cofre a la rareza `r`: destello, campanada, golpe y chispas de ese color. */
  function upgradeTo(r: Rarity, step: number) {
    const el = root.current;
    if (!el) return;
    el.style.setProperty("--rc", colorOf(r));
    if (!fxOn()) return;
    sfx.chestUpgrade(step);
    const fx = layer();
    const g = geo.current;
    if (fx && g) burst({ layer: fx, x: g.mouth.x, y: g.mouth.y + 16, count: 16, kind: "spark", color: colorOf(r), velocity: [120, 300], angle: [-170, -10], gravity: 500 });
    ctx.current?.add(() => {
      gsap.fromTo(".chest-flash", { opacity: 0.9, scale: 0.4 }, { opacity: 0, scale: 1.8, duration: 0.45, ease: "power2.out" });
      quake(stageOf(), 5, 0.25);
    });
  }

  /** Cada objeto, al aterrizar, se queda flotando; los épicos o mejores con el brillo latiendo. */
  function startFloat(itemEl: HTMLElement, i: number) {
    ctx.current?.add(() => {
      gsap.to(itemEl, { y: -5, duration: 1.3 + i * 0.12, yoyo: true, repeat: -1, ease: "sine.inOut" });
    });
  }
  function startPulse(itemEl: HTMLElement) {
    ctx.current?.add(() => {
      gsap.to(itemEl.querySelector(".chest-item-glow"), { opacity: 0.25, duration: 0.9, yoyo: true, repeat: -1, ease: "sine.inOut" });
    });
  }

  function open() {
    const el = root.current;
    const fx = layer();
    if (!el || !fx || phase.current !== "closed") return;
    phase.current = "opening";
    openedAt.current = performance.now();
    idle.current?.kill();
    const chest = el.querySelector<HTMLElement>(".chest-body")!;
    const stage = stageOf();
    const mouth = geo.current?.mouth ?? (() => {
      const c = centerIn(fx, chest);
      return { x: c.x, y: c.y - 18 };
    })();
    const itemEls = [...el.querySelectorAll<HTMLElement>(".chest-item")];
    // Cada objeto sale del cofre hacia su hueco: desplazamiento desde la boca del cofre.
    const offsets = itemEls.map((it) => {
      const p = centerIn(fx, it);
      return { x: mouth.x - p.x, y: mouth.y - p.y };
    });
    const box = chest.getBoundingClientRect();
    const dim = calm() ? 0.4 : 1;

    ctx.current?.add(() => {
      gsap.set(chest, { x: 0, y: 0, rotation: 0 });
      screen.current?.style.setProperty("--cx", `${box.left + box.width / 2}px`);
      screen.current?.style.setProperty("--cy", `${box.top + box.height * 0.4}px`);

      const tl = gsap.timeline({
        defaults: { immediateRender: false },
        onComplete: () => {
          phase.current = "open";
          onOpenedRef.current();
        },
      });
      openTl.current = tl;

      // ── 1. Carga: penumbra, el cofre se hincha y tiembla, la luz se escapa y la energía se concentra.
      const C0 = 0.1;
      tl.to(".chest-hint", { opacity: 0, duration: 0.15 }, 0)
        .to(".chest-vignette", { opacity: 1, duration: 0.6, ease: "power2.out" }, 0)
        .add(() => fxOn() && sfx.chestCharge(CHARGE + 0.1), C0)
        .to(chest, { y: -12, scale: 1.14, duration: CHARGE, ease: "power1.in" }, C0)
        .add(tremble(chest, CHARGE, 0.6, 7, { rotate: 0.55, vertical: false }), C0)
        .add(tremble(stage, CHARGE, 0, 2.6), C0)
        .to(".chest-seam", { opacity: 1, duration: CHARGE * 0.8 }, C0)
        .to(".chest-aura", { opacity: 1, scale: 1.55, duration: CHARGE, ease: "power2.in" }, C0)
        .to(".chest-leak", { opacity: 1, scaleY: 1, duration: CHARGE * 0.85, stagger: { each: 0.1, from: "center" }, ease: "power2.in" }, C0 + 0.15)
        .add(() => fxOn() && implode({ layer: fx, ...mouth, count: 14, radius: [90, 170], color: "var(--rc)", duration: [0.45, 0.6] }), C0)
        .add(() => fxOn() && implode({ layer: fx, ...mouth, count: 18, radius: [80, 150], color: "var(--rc)", duration: [0.35, 0.5] }), C0 + CHARGE * 0.4)
        .add(() => fxOn() && implode({ layer: fx, ...mouth, count: 24, radius: [70, 130], color: "var(--rc)", duration: [0.25, 0.4] }), C0 + CHARGE * 0.72);
      chargeUps.forEach((r, k) => tl.add(() => upgradeTo(r, k), C0 + CHARGE * UP_AT[chargeUps.length - 1][k]));

      // ── 2. Compresión y una pausa mínima antes del golpe (hit-stop).
      const POP = C0 + CHARGE + 0.16;
      tl.to(chest, { scaleX: 1.26, scaleY: 0.9, y: -4, duration: 0.09, ease: "power2.in" }, POP - 0.16).addLabel("pop", POP);

      // ── 3. Estallido.
      tl.add(() => {
        if (top === LEGENDARY) upgradeTo("legendary", chargeUps.length);
        if (!fxOn()) return;
        sfx.chestOpen(top);
        sfx.coins(18);
        burst({ layer: fx, ...mouth, count: 34, kind: "coin", velocity: [280, 560], angle: [-130, -50], gravity: 1100, spread: 20 });
        for (const it of contents) {
          const tier = rarityTier(it.rarity);
          burst({ layer: fx, ...mouth, count: 10 + tier * 7, kind: "spark", color: colorOf(it.rarity), velocity: [160, 380 + tier * 60], angle: [-175, -5], gravity: 420, spread: 22 });
        }
        // Ascuas que suben y destellos que se quedan titilando en el aire.
        burst({ layer: fx, x: [mouth.x - 120, mouth.x + 120], y: mouth.y + 20, count: 22, kind: "glow", color: "var(--rc)", velocity: [30, 110], angle: [-110, -70], gravity: -40, duration: [1.4, 2.4], delay: [0, 0.6] });
        twinkle({ layer: fx, x: [mouth.x - 230, mouth.x + 230], y: [mouth.y - 170, mouth.y + 40], count: 16 + top * 4, color: "var(--rc)", delay: [0.1, 1.6] });
        if (top >= MYTHIC) burst({ layer: fx, ...mouth, count: 20, kind: "star", color: "var(--rc)", velocity: [90, 280], angle: [-180, 0], gravity: 110, duration: [1.4, 2.2], size: [9, 15] });
        // Lluvia de monedas por toda la pantalla.
        const scr = screenFx.current;
        if (scr) {
          const w = scr.clientWidth;
          burst({ layer: scr, x: [w * 0.15, w * 0.85], y: -24, count: 26 + top * 4, kind: "coin", velocity: [40, 160], angle: [75, 105], gravity: 800, duration: [1.4, 2.2], delay: [0.05, 1.1] });
        }
      }, "pop")
        .set(chest, { scaleX: 1.14, scaleY: 1.14, y: -12 }, "pop")
        .to(".chest-lid", { y: -95, x: -18, rotation: -42, duration: 0.6, ease: "power3.out", transformOrigin: "20% 100%" }, "pop")
        .to(".chest-lid", { opacity: 0, duration: 0.3 }, "pop+=0.35")
        .fromTo(".chest-flash", { opacity: 1, scale: 0.3 }, { opacity: 0, scale: 3.2, duration: 0.85, ease: "power2.out" }, "pop")
        .fromTo(".chest-ring", { opacity: 0.95, scale: 0.15 }, { opacity: 0, scale: 4.2, duration: 0.9, stagger: 0.09, ease: "power2.out" }, "pop")
        .fromTo(".chest-godrays", { opacity: 0, scale: 0.3 }, { opacity: 0.95, scale: 1, duration: 0.6, ease: "power3.out" }, "pop")
        .fromTo(".chest-beam", { opacity: 0, scaleY: 0, scaleX: 0.4 }, { opacity: 1, scaleY: 1, scaleX: 1, duration: 0.35, ease: "power3.out" }, "pop")
        .to(".chest-leak", { scaleY: 3.2, opacity: 0, duration: 0.5, ease: "power2.out" }, "pop")
        .to(".chest-vignette", { opacity: 0.8, duration: 0.25 }, "pop")
        .add(quake(stage, POP_SHAKE[top], 0.55), "pop");
      if (stage && !calm()) tl.fromTo(stage, { scale: 1.08 }, { scale: 1, duration: 0.8, ease: "elastic.out(1, 0.45)" }, "pop");
      if (screenFlash.current) tl.fromTo(screenFlash.current, { opacity: FLASH[top] * dim }, { opacity: 0, duration: 1, ease: "power2.out" }, "pop");
      gsap.to(".chest-godrays", { rotation: 360, duration: 14, repeat: -1, ease: "none" });

      // ── 4. Los objetos salen volando y aterrizan con un golpe proporcional a su rareza.
      let at = POP + 0.4;
      let lastLaunch = at;
      contents.forEach((it, i) => {
        const tier = rarityTier(it.rarity);
        const sel = `.chest-item:nth-child(${i + 1})`;
        const itemEl = itemEls[i];
        if (tier === LEGENDARY) {
          // Antes del legendario: silencio, más penumbra y energía dorada que se concentra.
          tl.add(() => {
            if (!fxOn()) return;
            sfx.chestCharge(0.5);
            implode({ layer: fx, ...mouth, count: 28, radius: [60, 150], color: colorOf("legendary"), duration: [0.3, 0.45] });
          }, at)
            .to(".chest-vignette", { opacity: 0.92, duration: 0.3 }, at)
            .add(tremble(stage, 0.45, 0, 3), at);
          at += 0.5;
        }
        const land = at + 0.6;
        lastLaunch = at;
        tl.fromTo(
          sel,
          { x: offsets[i].x, y: offsets[i].y, scale: 0.15, opacity: 0, rotateY: 720 },
          { x: 0, y: 0, scale: 1, opacity: 1, rotateY: 0, duration: 0.6, ease: "power3.out" },
          at,
        )
          .to(sel, { keyframes: [{ scale: 1.28, duration: 0.07, ease: "power2.out" }, { scale: 1, duration: 0.55, ease: "elastic.out(1, 0.4)" }] }, land)
          .fromTo(`${sel} .chest-item-flash`, { opacity: 1 }, { opacity: 0, duration: 0.5, ease: "power2.out" }, land)
          .fromTo(`${sel} .chest-item-ring`, { opacity: 0.95, scale: 0.3 }, { opacity: 0, scale: 2.8, duration: 0.7, ease: "power2.out" }, land)
          .fromTo(
            `${sel} .chest-item-glow`,
            { opacity: 1, scale: 0.3 },
            { opacity: tier >= EPIC ? 0.6 : 0, scale: tier >= MYTHIC ? 2.8 : 2.1, duration: 1, ease: "power2.out" },
            land,
          )
          .add(quake(stage, LAND_SHAKE[tier], 0.4), land)
          .add(() => {
            startFloat(itemEl, i);
            if (!fxOn()) return;
            sfx.reveal(tier);
            if (tier >= EPIC) sfx.fanfare(tier);
            const p = centerIn(fx, itemEl.querySelector(".iart") ?? itemEl);
            burst({ layer: fx, ...p, count: 12 + tier * 6, kind: "spark", color: colorOf(it.rarity), velocity: [100, 240 + tier * 40], angle: [-180, 0], gravity: 280, duration: [0.6, 1.1] });
            if (tier >= RARE) twinkle({ layer: fx, x: [p.x - 70, p.x + 70], y: [p.y - 70, p.y + 60], count: 6 + tier * 3, color: colorOf(it.rarity), delay: [0, 0.9] });
            const scr = screenFx.current;
            if (tier === LEGENDARY && scr) {
              const w = scr.clientWidth;
              burst({ layer: scr, x: [w * 0.08, w * 0.92], y: -20, count: 36, kind: "star", color: colorOf("legendary"), velocity: [30, 120], angle: [80, 100], gravity: 260, duration: [1.8, 2.8], delay: [0, 1.2], size: [8, 15] });
              sfx.coins(16);
            }
          }, land);
        if (tier >= EPIC) {
          tl.fromTo(`${sel} .chest-rays`, { opacity: 0, scale: 0.4 }, { opacity: 0.9, scale: 1, duration: 0.5 }, land).add(() => startPulse(itemEl), land + 1.05);
          gsap.to(`${sel} .chest-rays`, { rotation: 360, duration: tier === LEGENDARY ? 6 : 9, repeat: -1, ease: "none" });
          if (screenFlash.current) tl.fromTo(screenFlash.current, { opacity: FLASH[tier] * 0.8 * dim }, { opacity: 0, duration: 0.9, ease: "power2.out" }, land);
        }
        // Rótulo enorme para la mejor rareza, si es épica o superior.
        if (i === topIndex && tier >= EPIC && banner.current) {
          tl.fromTo(banner.current, { opacity: 0, scale: 2.3, y: 0 }, { opacity: 1, scale: 1, duration: 0.45, ease: "power4.out" }, land)
            .fromTo(banner.current.querySelector(".chest-banner-text"), { letterSpacing: "0.7em" }, { letterSpacing: "0.16em", duration: 0.6, ease: "power3.out" }, land)
            .to(banner.current, { opacity: 0, y: -26, duration: 0.5, ease: "power2.in" }, land + 1.7);
        }
        at += tier === LEGENDARY ? 0.75 : 0.5;
      });

      // ── 5. El cofre se retira en cuanto suelta el último objeto; la luz se calma y los objetos flotan.
      const retreat = lastLaunch + 0.35;
      const end = at + 0.2;
      tl.to(chest, { y: 46, opacity: 0, scale: 0.75, duration: 0.4, ease: "power2.in" }, retreat)
        .to(".chest-shadow", { opacity: 0, duration: 0.35 }, retreat)
        .to(".chest-beam, .chest-aura", { opacity: 0, duration: 0.8 }, end)
        .to(".chest-godrays", { opacity: top >= EPIC ? 0.3 : 0, duration: 1 }, end)
        .to(".chest-vignette", { opacity: 0, duration: 1 }, end + 0.4);
    });
  }

  function advance() {
    if (phase.current === "hidden") appear();
    if (phase.current === "appearing") appearTl.current?.progress(1);
    if (phase.current === "closed") open();
    else if (phase.current === "opening" && performance.now() - openedAt.current > SKIP_AFTER) {
      skipping.current = true;
      openTl.current?.progress(1);
      skipping.current = false;
    }
  }

  useImperativeHandle(ref, () => ({
    pending: () => contents.length > 0 && phase.current !== "open",
    appear,
    advance,
  }));

  if (!contents.length) return null;

  return (
    <div className="chest-zone" ref={root} style={{ "--rc": colorOf(RARITIES[teaser]) } as React.CSSProperties}>
      <span className="chest-vignette" />
      <span className="chest-godrays" />
      <span className="chest-aura" />
      <span className="chest-beam" />
      <span className="chest-shadow" />
      {LEAK_ANGLES.map((a) => (
        <span key={a} className="chest-leak" />
      ))}
      <span className="chest-flash" />
      {[0, 1, 2].map((i) => (
        <span key={i} className="chest-ring" />
      ))}

      <div className="chest-items">
        {contents.map((c, i) => (
          <div key={i} className={`chest-item is-${c.rarity}`} style={rarityStyle(c.item)}>
            {rarityTier(c.rarity) >= EPIC && <span className="chest-rays" />}
            <span className="chest-item-glow" />
            <span className="chest-item-ring" />
            <ItemTile item={c.item} isNew={c.isNew} />
            <span className="chest-item-flash" />
          </div>
        ))}
      </div>

      <button
        type="button"
        className="chest-body"
        aria-label={t("items.clear.openChest")}
        onClick={(e) => {
          e.stopPropagation();
          advance();
        }}
      >
        <ChestSvg />
      </button>
      <p className="chest-hint">{t(phone ? "mobile.touch.openChest" : "items.clear.openChest")}</p>
      <div className="chest-fx" />

      {/* Capa a pantalla completa, fuera del overlay: no se mueve con las sacudidas. */}
      {createPortal(
        <div className="chest-screen" ref={screen} style={{ "--rc": colorOf(topRarity) } as React.CSSProperties}>
          <span className="chest-screenflash" ref={screenFlash} />
          <div className="chest-screen-fx" ref={screenFx} />
          {top >= EPIC && (
            <div className="chest-banner" ref={banner}>
              <span className="chest-banner-stars">{"★".repeat(RARITY_META[topRarity].stars)}</span>
              <span className="chest-banner-text">{RARITY_META[topRarity].tag}!</span>
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}

function ChestSvg() {
  return (
    <svg className="chest-svg" viewBox="0 0 140 112" aria-hidden>
      <defs>
        <linearGradient id="chest-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="wood-a" />
          <stop offset="1" className="wood-b" />
        </linearGradient>
        <linearGradient id="chest-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="metal-a" />
          <stop offset="0.5" className="metal-b" />
          <stop offset="1" className="metal-c" />
        </linearGradient>
        <clipPath id="chest-lid-clip">
          <path d="M14 56 V40 Q14 14 70 14 Q126 14 126 40 V56 Z" />
        </clipPath>
      </defs>

      <g className="chest-base">
        <rect x="14" y="54" width="112" height="48" rx="3" className="wood" />
        <line x1="14" y1="72" x2="126" y2="72" className="chest-plank" />
        <line x1="14" y1="88" x2="126" y2="88" className="chest-plank" />
        <rect x="30" y="54" width="9" height="48" className="metal" />
        <rect x="101" y="54" width="9" height="48" className="metal" />
        <rect x="12" y="99" width="116" height="7" rx="2" className="metal" />
        <rect x="14" y="54" width="112" height="5" className="metal" />
        {[64, 80, 94].map((y) => (
          <g key={y}>
            <circle cx="34.5" cy={y} r="1.6" className="rivet" />
            <circle cx="105.5" cy={y} r="1.6" className="rivet" />
          </g>
        ))}
      </g>

      <rect className="chest-seam" x="16" y="52" width="108" height="4" rx="2" />

      <g className="chest-lid">
        <path d="M14 56 V40 Q14 14 70 14 Q126 14 126 40 V56 Z" className="wood" />
        <g clipPath="url(#chest-lid-clip)">
          <line x1="14" y1="34" x2="126" y2="34" className="chest-plank" />
          <rect x="30" y="10" width="9" height="46" className="metal" />
          <rect x="101" y="10" width="9" height="46" className="metal" />
        </g>
        <path d="M22 41 Q24 23 70 21 Q116 23 118 41" className="gloss" />
        <rect x="12" y="50" width="116" height="6" rx="2" className="metal" />
        {[28, 42].map((y) => (
          <g key={y}>
            <circle cx="34.5" cy={y} r="1.6" className="rivet" />
            <circle cx="105.5" cy={y} r="1.6" className="rivet" />
          </g>
        ))}
      </g>

      <g className="chest-lock">
        <rect x="61" y="46" width="18" height="22" rx="3" className="metal lock-plate" />
        <circle cx="70" cy="55" r="3" className="chest-keyhole" />
        <rect x="68.8" y="56" width="2.4" height="7" className="chest-keyhole" />
      </g>
    </svg>
  );
}

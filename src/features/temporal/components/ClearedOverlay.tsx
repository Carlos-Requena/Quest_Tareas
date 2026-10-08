import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import gsap from "gsap";
import { useGame } from "../../../store/game";
import { sfx } from "../../../lib/sfx";
import { burst, calm, centerIn, quake, twinkle } from "../../../lib/fx";
import { num } from "../../../i18n";
import { GoldIcon } from "../../../components/Header";
import type { TemporalState } from "../model";
import { tornEdge } from "../look";
import { seededRandom } from "../../../lib/id";
import { useTemporalUi, type TemporalClear } from "../ui";
import { heroFor } from "../heroes";
import { Skull } from "./Skull";
import { quote, titleSize } from "./PostedOverlay";
import { KeyHint } from "../../mobile";

/** Animación al cumplir un encargo (segundo vídeo de referencia). */
export function ClearedOverlay() {
  const clear = useTemporalUi((s) => s.cleared);
  const t = useGame((s) => (clear ? s.state.temporals.get(clear.temporalId) : undefined));
  if (!clear || !t) return null;
  return <Scene key={clear.temporalId} clear={clear} t={t} />;
}

const rand = (n: number) => String(Math.floor(Math.random() * n));

/**
 * 1. Pergamino con la cabecera «Logro del día» apagada.
 * 2. El texto dorado llega gigante y estalla: fogonazo blanco, destellos horizontales,
 *    rayos y chispas (estallido brillante + acorde en fa mayor).
 * 3. El fogonazo se retira: aparece la ilustración de su tipo de encargo, impresa en sepia
 *    (sin ninguna, la silueta del aventurero saltando con la espada), y un destello
 *    recorre el oro.
 * 4. Las calaveras de la dificultad se vuelven de oro una a una (vencidas).
 * 5. «💀 × N = 00000 G»: los dígitos giran como una tragaperras (tic-tic), se detienen
 *    de izquierda a derecha y suena la campanilla con la melodía de cierre. Monedas.
 * 6. La XP cuenta hacia arriba y, si toca, «Level Up!».
 */
function Scene({ clear, t }: { clear: TemporalClear; t: TemporalState }) {
  const { t: tr } = useTranslation();
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline>(undefined);
  const closing = useRef(false);
  const clip = useMemo(() => tornEdge(`${t.id}:clear`, 16, 46), [t.id]);
  // Una al azar de public/temporal/<tipo>/, elegida una vez por escena.
  const [art] = useState(() => heroFor(t.kind));
  // Fila centrada entre el texto y la recompensa: «💀💀💀» → «💀 × 3 = …».
  const skulls = useMemo(() => {
    const rnd = seededRandom(`${t.id}:clear`);
    return Array.from({ length: t.difficulty }, (_, i) => ({
      x: 50 + (i - (t.difficulty - 1) / 2) * 7.5,
      y: 61 + (rnd() - 0.5) * 4,
      rotate: (rnd() - 0.5) * 30,
      scale: 0.9 + rnd() * 0.15,
    }));
  }, [t.id, t.difficulty]);
  const digits = String(Math.max(0, Math.round(clear.reward.gold))).split("");
  const leveled = clear.after.level > clear.before.level;
  const lines = [quote(t.title), quote(tr("temporal.clear.done"))];

  /** Estado final, sin animación (al saltar). */
  const settle = () => {
    const el = root.current;
    if (!el) return;
    el.querySelectorAll<HTMLElement>(".tco-digit").forEach((d, i) => (d.textContent = digits[i]));
    el.querySelectorAll(".tco-skulls .skull").forEach((s) => s.classList.add("skull-gold"));
    const xp = el.querySelector(".tco-xp-val");
    if (xp) xp.textContent = `+${num(clear.reward.xp)}`;
  };

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = <T extends Element = HTMLElement>(s: string) => el.querySelector<T>(s);
    const stage = q(".tco-stage");
    const layer = q(".tco-fx")!;
    const soft = calm();
    const counter = { xp: 0 };

    const ctx = gsap.context(() => {
      const T = gsap.timeline();
      tl.current = T;
      T.fromTo(".tco-bg", { opacity: 0 }, { opacity: 1, duration: 0.25 })
        .fromTo(".tco-sheet", { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: 0.3, ease: "power2.out" }, 0.03)
        .fromTo(".tco-head", { opacity: 0 }, { opacity: 0.35, duration: 0.3 }, 0.1)
        .add(() => sfx.posterWhoosh(0.3), 0.15)
        .fromTo(
          ".tco-ghost",
          { opacity: (i: number) => 0.38 - i * 0.1, scale: (i: number) => 4.4 + i * 1.2 },
          { opacity: 0, scale: 1, duration: 0.33, ease: "power4.in", stagger: 0.02 },
          0.17,
        )
        .fromTo(".tco-text", { opacity: 0, scale: 3.6, filter: "blur(10px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.32, ease: "power4.in" }, 0.17)
        .addLabel("impact", 0.49)
        .add(() => {
          sfx.clearBurst();
          quake(stage, 12, 0.55);
          const c = centerIn(layer, q(".tco-text")!);
          burst({ layer, ...c, count: 34, kind: "spark", color: "var(--gold-hi)", velocity: [220, 520], angle: [-180, 180], gravity: 260, duration: [0.6, 1.2], size: [4, 9], spread: 120 });
          burst({ layer, ...c, count: 16, kind: "star", color: "#fff", velocity: [120, 300], angle: [-180, 180], gravity: 80, duration: [0.7, 1.3], size: [8, 16] });
        }, "impact")
        // Fogonazo blanco que lo cubre todo y se retira despacio, con destellos horizontales.
        .fromTo(".tco-flash", { opacity: 0 }, { opacity: soft ? 0.5 : 1, duration: 0.07 }, "impact")
        .to(".tco-flash", { opacity: 0, duration: 1.1, ease: "power2.in" }, "impact+=0.45")
        .fromTo(".tco-streak", { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.3, ease: "power3.out", stagger: 0.05 }, "impact")
        .to(".tco-streak", { opacity: 0, duration: 0.9 }, "impact+=0.45")
        .fromTo(".tco-rays", { opacity: 0, scale: 0.6 }, { opacity: 0.9, scale: 1, duration: 0.5, ease: "power2.out" }, "impact")
        .to(".tco-rays", { opacity: 0.4, duration: 1.2 }, "impact+=0.7")
        .to(".tco-head", { opacity: 1, duration: 0.5 }, "impact+=0.7")
        .fromTo(".tco-orn", { scaleX: 0 }, { scaleX: 1, duration: 0.55, ease: "power3.out" }, "impact+=0.7")
        .fromTo(".tco-hero", { opacity: 0, x: 50 }, { opacity: 1, x: 0, duration: 0.8, ease: "power2.out" }, "impact+=0.75")
        .fromTo(".tco-shade", { opacity: 0, scale: 1.2 }, { opacity: 0.1, scale: 1, duration: 1 }, "impact+=0.7")
        .add(() => sfx.glint(), "impact+=0.95")
        .fromTo(".tco-glint", { backgroundPosition: "160% 0" }, { backgroundPosition: "-60% 0", duration: 0.85, ease: "power1.inOut" }, "impact+=0.93");

      // Las calaveras de la dificultad se vuelven de oro: el peligro, vencido.
      const purifyAt = 0.49 + 1.15;
      T.fromTo(".tco-skulls .skull", { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.3, stagger: 0.05, ease: "back.out(2)" }, purifyAt - 0.35);
      skulls.forEach((_, i) => {
        const at = purifyAt + i * 0.17;
        T.add(() => {
          const sk = q(`.tco-skull-${i}`);
          if (!sk) return;
          sk.classList.add("skull-gold");
          sfx.purify(i);
          const c = centerIn(layer, sk);
          burst({ layer, ...c, count: 8, kind: "spark", color: "var(--gold-hi)", velocity: [60, 160], angle: [-170, -10], gravity: 260, duration: [0.4, 0.7], size: [3, 6] });
        }, at).fromTo(`.tco-skull-${i}`, { scale: 1.45 }, { scale: 1, duration: 0.35, ease: "back.out(3)" }, at);
      });

      // Recompensa: «💀 × N = …», con los dígitos girando como una tragaperras.
      const rollAt = purifyAt + skulls.length * 0.17 + 0.25;
      const ROLL = 1.19; // lo que dura la primera frase de la melodía: la campanilla cae al final
      const stops = digits.map((_, i) => rollAt + ROLL - (digits.length - 1 - i) * 0.12 - 0.05);
      const stopped = digits.map(() => false);
      const digitEls = () => el.querySelectorAll<HTMLElement>(".tco-digit");
      let lastSpin = 0;
      T.fromTo(".tco-reward", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3 }, rollAt - 0.15)
        .add(() => {
          sfx.slotRoll(ROLL);
          sfx.clearMelody();
        }, rollAt)
        .to(
          {},
          {
            duration: ROLL,
            onUpdate() {
              const now = performance.now();
              if (now - lastSpin < 45) return;
              lastSpin = now;
              digitEls().forEach((d, i) => !stopped[i] && (d.textContent = rand(10)));
            },
          },
          rollAt,
        );
      stops.forEach((at, i) =>
        T.add(() => {
          stopped[i] = true;
          const d = digitEls()[i];
          if (d) d.textContent = digits[i];
          sfx.slotStop();
        }, at).fromTo(`.tco-digit-${i}`, { y: -10, scale: 1.3 }, { y: 0, scale: 1, duration: 0.25, ease: "bounce.out" }, at),
      );
      const ding = rollAt + ROLL;
      T.add(() => {
        sfx.slotDing();
        sfx.coins(10);
        const c = centerIn(layer, q(".tco-digits")!);
        burst({ layer, ...c, count: 18, kind: "coin", velocity: [180, 340], angle: [-130, -50], gravity: 950, duration: [0.7, 1.1], size: [10, 14] });
        twinkle({ layer, x: [c.x - 80, c.x + 80], y: [c.y - 30, c.y + 20], count: 6, color: "var(--gold-hi)", delay: [0, 0.4] });
      }, ding)
        .fromTo(".tco-digits", { textShadow: "0 0 0px rgba(255,236,170,0)" }, { textShadow: "0 0 22px rgba(255,236,170,1)", duration: 0.15, yoyo: true, repeat: 1 }, ding)
        .fromTo(".tco-xp", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.3 }, ding + 0.2)
        .to(counter, { xp: clear.reward.xp, duration: 0.7, ease: "power2.out", onUpdate: () => void (q(".tco-xp-val")!.textContent = `+${num(Math.round(counter.xp))}`) }, ding + 0.2);
      if (leveled) {
        T.add(() => sfx.levelUp(), ding + 0.9).fromTo(".tco-levelup", { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(3)" }, ding + 0.9);
      }
      T.fromTo(".tco-hint", { opacity: 0 }, { opacity: 1, duration: 0.4 }, ding + (leveled ? 1.3 : 0.8));
    }, el);

    return () => {
      ctx.revert();
      layer.replaceChildren();
    };
  }, [clear]);

  /** Primer clic: salta al final. Segundo: cierra y el cartel recibe su sello en el tablón. */
  const next = () => {
    const T = tl.current;
    if (T && T.progress() < 1) {
      T.progress(1, true);
      settle();
      return;
    }
    if (closing.current) return;
    closing.current = true;
    gsap.to(root.current, {
      opacity: 0,
      duration: 0.3,
      onComplete: () => {
        const ui = useTemporalUi.getState();
        ui.setCleared(undefined);
        ui.bid(clear.temporalId);
      },
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!["Enter", "Escape", " ", "a"].includes(e.key)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      next();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  const text = (cls: string) => (
    <>
      <p className={`${cls} tco-l1 ${titleSize(t.title)}`}>{lines[0]}</p>
      <p className={`${cls} tco-l2`}>{lines[1]}</p>
    </>
  );

  return (
    <div className="tco" ref={root} onClick={next}>
      <div className="tco-bg" />
      <div className="tco-stage">
        <div className="tco-sheet">
          <div className="tco-paper" style={{ clipPath: clip }}>
            <div className="tco-rays" />
            <Skull className="tco-shade" />
            {art ? <Art src={art} /> : <Hero />}
            <div className="tpo-frame" />
            <div className="tco-head">
              <span className="tco-orn" />
              <span className="tco-kind">{tr("temporal.clear.header")}</span>
              <span className="tco-orn" />
            </div>
            <div className="tco-textbox">
              {[0, 1, 2].map((i) => (
                <div key={i} className="tco-ghost" aria-hidden>
                  {text("tco-line")}
                </div>
              ))}
              <div className="tco-text">{text("tco-line")}</div>
              <div className="tco-glint" aria-hidden>
                {text("tco-line")}
              </div>
            </div>
            <div className="tco-reward">
              <Skull className="skull-gold tco-ico" />
              <span className="tco-x">×</span>
              <b className="num tco-n">{t.difficulty}</b>
              <span className="tco-x">=</span>
              <b className="num tco-digits">
                {digits.map((_, i) => (
                  <span key={i} className={`tco-digit tco-digit-${i}`}>
                    0
                  </span>
                ))}
              </b>
              <GoldIcon />
              <span className="tco-unit">G</span>
            </div>
            <div className="tco-xp">
              <span className="reward-ico xp">XP</span>
              <span className="tco-xp-lbl">{tr("temporal.clear.xp")}</span>
              <b className="num tco-xp-val">+0</b>
              {leveled && <span className="tco-levelup">Level Up!</span>}
            </div>
            <div className="tco-flash" />
            <span className="tco-streak s1" />
            <span className="tco-streak s2" />
            <span className="tco-streak s3" />
          </div>
          <div className="tco-skulls">
            {skulls.map((s, i) => (
              <div key={i} className="tpo-spot" style={{ left: `${s.x}%`, top: `${s.y}%`, transform: `rotate(${s.rotate}deg) scale(${s.scale})` }}>
                <Skull className={`tco-skull-${i}`} />
              </div>
            ))}
          </div>
        </div>
        <div className="tco-fx" />
      </div>
      <p className="tco-hint">
        <KeyHint i18nKey="temporal.clear.hint" touch="continue" />
      </p>
    </div>
  );
}

/** Ilustración del tipo de encargo, impresa en tinta sepia sobre el pergamino como la silueta. */
function Art({ src }: { src: string }) {
  return (
    <div className="tco-hero tco-art" aria-hidden>
      <img src={src} alt="" draggable={false} decoding="async" />
    </div>
  );
}

/** Silueta del aventurero que salta con la espada en alto, como en el vídeo; la que sale si su tipo no tiene ilustraciones. */
function Hero() {
  return (
    <svg className="tco-hero" viewBox="0 -14 210 214" aria-hidden>
      <g fill="currentColor" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M112 70C84 78 56 104 30 150c26-6 46-14 66-26Z" stroke="none" />
        <path d="M106 64l24 8-16 60-24-6Z" strokeWidth="5" />
        <circle cx="122" cy="48" r="14" stroke="none" />
        <path d="M108 44l-9-5 10-1-2-11 9 6 3-11 5 10 9-7-2 11 9-1" strokeWidth="3.5" fill="none" />
        <path d="M126 78l20-18 12-22" fill="none" strokeWidth="11" />
        <path d="M154 44l46-50" fill="none" strokeWidth="6" />
        <path d="M147 35l17 15" fill="none" strokeWidth="5" />
        <path d="M110 80L88 98 68 94" fill="none" strokeWidth="10" />
        <path d="M110 128l28 16-6 34" fill="none" strokeWidth="13" />
        <path d="M96 128L76 166 46 182" fill="none" strokeWidth="13" />
      </g>
    </svg>
  );
}

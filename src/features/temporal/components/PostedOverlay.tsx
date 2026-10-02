import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Trans, useTranslation } from "react-i18next";
import gsap from "gsap";
import { useGame } from "../../../store/game";
import { sfx } from "../../../lib/sfx";
import { burst, calm, centerIn, quake, twinkle } from "../../../lib/fx";
import { num } from "../../../i18n";
import { KIND_META, type TemporalState } from "../model";
import { skullSpots, tornEdge } from "../look";
import { longDue } from "../format";
import { useTemporalUi } from "../ui";
import { InkSplat, Skull } from "./Skull";

/** Animación al clavar un encargo nuevo (primer vídeo de referencia). */
export function PostedOverlay() {
  const id = useTemporalUi((s) => s.posted);
  const t = useGame((s) => (id ? s.state.temporals.get(id) : undefined));
  if (!id || !t) return null;
  return <Scene key={id} t={t} />;
}

/** «texto» con espacios que no se parten: las comillas nunca se quedan solas en otra línea. */
export const quote = (s: string) => `«\u00a0${s}\u00a0»`;

/** Tamaño del título según lo largo que sea, para que quepa en el pergamino. */
export const titleSize = (s: string) => (s.length > 48 ? "is-long" : s.length > 26 ? "is-mid" : "");

/**
 * 1. El pergamino aparece con la cabecera apagada.
 * 2. El texto llega gigante, con estela de zoom y desenfoque, y golpea el pergamino (silbido + golpe de orquesta).
 * 3. Un destello recorre las letras y la cabecera se enciende en rojo.
 * 4. Las calaveras caen una a una y se estampan con su mancha de tinta; la interfaz encaja cada golpe.
 * 5. La recompensa se escribe y, al final, la «cámara» se lanza contra el pergamino: zoom, desenfoque
 *    y fogonazo blanco, y el cartel cae en su sitio del tablón.
 */
function Scene({ t }: { t: TemporalState }) {
  const { t: tr } = useTranslation();
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline>(undefined);
  const meta = KIND_META[t.kind];
  const clip = useMemo(() => tornEdge(`${t.id}:big`, 16, 46), [t.id]);
  const skulls = useMemo(() => skullSpots(`${t.id}:big`, t.difficulty, "landscape"), [t.id, t.difficulty]);
  const lines = [quote(longDue(t)), quote(t.title)];

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const q = <T extends Element = HTMLElement>(s: string) => el.querySelector<T>(s);
    const stage = q(".tpo-stage");
    const layer = q(".tpo-fx")!;
    const soft = calm();

    const ctx = gsap.context(() => {
      const T = gsap.timeline();
      tl.current = T;
      T.fromTo(".tpo-bg", { opacity: 0 }, { opacity: 1, duration: 0.25 })
        .fromTo(".tpo-sheet", { opacity: 0, scale: 1.1, y: 12 }, { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: "power2.out" }, 0.04)
        .fromTo(".tpo-head", { opacity: 0 }, { opacity: 0.45, duration: 0.3 }, 0.15)
        .add(() => sfx.posterWhoosh(0.34), 0.22)
        // Estela de zoom: copias del texto, cada vez más grandes, que se cierran sobre él.
        .fromTo(
          ".tpo-ghost",
          { opacity: (i: number) => 0.34 - i * 0.09, scale: (i: number) => 4.2 + i * 1.1 },
          { opacity: 0, scale: 1, duration: 0.36, ease: "power4.in", stagger: 0.025 },
          0.24,
        )
        .fromTo(".tpo-text", { opacity: 0, scale: 3.4, filter: "blur(10px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.34, ease: "power4.in" }, 0.24)
        .addLabel("impact", 0.58)
        .add(() => {
          sfx.posterSlam();
          quake(stage, 10, 0.5);
          const at = centerIn(layer, q(".tpo-text")!);
          burst({ layer, x: [at.x - 260, at.x + 260], y: at.y + 40, count: 22, kind: "glow", color: "var(--paper-edge)", velocity: [40, 160], angle: [-170, -10], gravity: 120, duration: [0.6, 1.2], size: [5, 12] });
        }, "impact")
        .fromTo(".tpo-shock", { scale: 0.3, opacity: 0.85 }, { scale: 2.4, opacity: 0, duration: 0.65, ease: "power2.out" }, "impact")
        .fromTo(".tpo-flash", { opacity: 0.6 }, { opacity: 0, duration: 0.55 }, "impact")
        // Destello que recorre las letras.
        .add(() => sfx.glint(), "impact+=0.32")
        .fromTo(".tpo-glint", { backgroundPosition: "160% 0" }, { backgroundPosition: "-60% 0", duration: 0.8, ease: "power1.inOut" }, "impact+=0.3")
        .add(() => {
          const r = q(".tpo-text")!.getBoundingClientRect();
          const l = layer.getBoundingClientRect();
          twinkle({ layer, x: [r.left - l.left, r.right - l.left], y: [r.top - l.top, r.bottom - l.top], count: 9, color: "#fff", delay: [0, 0.6] });
        }, "impact+=0.36")
        // La cabecera se enciende y se dibujan sus filetes.
        .add(() => el.classList.add("is-lit"), "impact+=0.5")
        .to(".tpo-head", { opacity: 1, duration: 0.4 }, "impact+=0.5")
        .fromTo(".tpo-orn", { scaleX: 0 }, { scaleX: 1, duration: 0.55, ease: "power3.out" }, "impact+=0.5")
        .fromTo(".tpo-meta > *", { opacity: 0, y: 8 }, { opacity: 1, y: 0, stagger: 0.08, duration: 0.3 }, "impact+=0.7");

      // Las calaveras se estampan una a una.
      const first = 0.58 + 0.95;
      skulls.forEach((s, i) => {
        const at = first + i * 0.24;
        T.fromTo(
          `.tpo-skull-${i}`,
          { opacity: 0, scale: 3.4, rotation: s.rotate - 55 },
          { opacity: 1, scale: s.scale, rotation: s.rotate, duration: 0.17, ease: "power4.in" },
          at,
        )
          .fromTo(`.tpo-splat-${i}`, { opacity: 0.9, scale: 0.25 }, { opacity: 0.38, scale: 1, duration: 0.32, ease: "power3.out", immediateRender: false }, at + 0.17)
          .add(() => {
            sfx.skullStamp(i);
            quake(stage, 4 + i * 1.2, 0.26);
            const sk = q(`.tpo-skull-${i}`);
            if (sk) {
              const c = centerIn(layer, sk);
              burst({ layer, ...c, count: 7, kind: "spark", color: "var(--sk-mid)", velocity: [80, 200], angle: [-180, 0], gravity: 700, duration: [0.35, 0.6], size: [4, 7] });
            }
          }, at + 0.17);
      });
      const afterSkulls = first + skulls.length * 0.24 + 0.15;

      T.fromTo(".tpo-reward", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.5, ease: "power2.out" }, afterSkulls)
        .add(() => sfx.coins(5), afterSkulls + 0.1)
        .fromTo(".tpo-hint", { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.8)
        .addLabel("finale", afterSkulls + 1.15)
        // La «cámara» se lanza contra el pergamino y todo se funde en blanco.
        .add(() => sfx.posterWhoosh(0.42), "finale")
        .to(".tpo-hint", { opacity: 0, duration: 0.2 }, "finale")
        .fromTo(
          ".tpo-zoom",
          { scale: 1, filter: "blur(0px) brightness(1)" },
          { scale: soft ? 1.08 : 2.7, filter: "blur(10px) brightness(1.8)", duration: 0.5, ease: "power3.in", immediateRender: false },
          "finale",
        )
        .fromTo(".tpo-white", { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.in" }, "finale+=0.22")
        .add(() => useTemporalUi.getState().land(t.id), "finale+=0.55")
        .to(el, { opacity: 0, duration: 0.45, ease: "power1.out" }, "finale+=0.6")
        .add(() => useTemporalUi.getState().setPosted(undefined));
    }, el);

    return () => {
      ctx.revert();
      layer.replaceChildren();
    };
  }, [t.id, skulls]);

  /** Clic o Enter: salta directamente al final (sin sonidos acumulados). */
  const skip = () => {
    const T = tl.current;
    if (!T) return;
    const finale = T.labels.finale;
    if (T.time() < finale) {
      T.seek(finale, true);
      root.current?.classList.add("is-lit");
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!["Enter", "Escape", " "].includes(e.key)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      skip();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const text = (cls: string) => (
    <>
      <p className={`${cls} tpo-l1`}>{lines[0]}</p>
      <p className={`${cls} tpo-l2 ${titleSize(t.title)}`}>{lines[1]}</p>
    </>
  );

  return (
    <div className={`tpo ${meta.red ? "is-red" : ""}`} ref={root} onClick={skip}>
      <div className="tpo-bg" />
      <div className="tpo-stage">
        <div className="tpo-zoom">
          <div className="tpo-sheet">
            <div className="tpo-paper" style={{ clipPath: clip }}>
              <div className="tpo-frame" />
              <div className="tpo-head">
                <span className="tpo-orn" />
                <span className="tpo-kind">{tr(`temporal.kinds.${t.kind}`)}</span>
                <span className="tpo-orn" />
              </div>
              <div className="tpo-textbox">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="tpo-ghost" aria-hidden>
                    {text("tpo-line")}
                  </div>
                ))}
                <div className="tpo-text">{text("tpo-line")}</div>
                <div className="tpo-glint" aria-hidden>
                  {text("tpo-line")}
                </div>
              </div>
              <div className="tpo-meta">
                {t.place && <span className="tpo-place">{t.place}</span>}
                <span className="tpo-reward num">
                  {num(t.reward.gold)} <small>G</small> · {num(t.reward.xp)} <small>XP</small>
                </span>
              </div>
              <div className="tpo-flash" />
            </div>
            <div className="tpo-shock" />
            <div className="tpo-skulls">
              {skulls.map((s, i) => (
                <div key={i} className="tpo-spot" style={{ left: `${s.x}%`, top: `${s.y}%` }}>
                  <InkSplat className={`tpo-splat-${i}`} seed={i} />
                  <Skull className={`tpo-skull-${i}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="tpo-fx" />
      </div>
      <div className="tpo-white" />
      <p className="tpo-hint">
        <Trans i18nKey="temporal.posted.hint" components={{ kbd: <kbd /> }} />
      </p>
    </div>
  );
}

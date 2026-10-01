import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { useGame } from "../store/game";
import { CATEGORY_META } from "../domain/types";
import { seededRandom } from "../lib/id";
import { sfx } from "../lib/sfx";
import { GoldIcon } from "./Header";

const COLS = 4;
const ROWS = 3;

/** Trocea un rectángulo en triángulos con vértices interiores desplazados. */
function makeShards(seed: string) {
  const rnd = seededRandom(seed);
  const pts: [number, number][][] = [];
  for (let r = 0; r <= ROWS; r++) {
    pts.push([]);
    for (let c = 0; c <= COLS; c++) {
      const edgeX = c === 0 || c === COLS;
      const edgeY = r === 0 || r === ROWS;
      const x = (c / COLS) * 100 + (edgeX ? 0 : (rnd() - 0.5) * 16);
      const y = (r / ROWS) * 100 + (edgeY ? 0 : (rnd() - 0.5) * 22);
      pts[r].push([x, y]);
    }
  }
  const shards: { clip: string; cx: number; cy: number }[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const a = pts[r][c], b = pts[r][c + 1], d = pts[r + 1][c], e = pts[r + 1][c + 1];
      const tris = (r + c) % 2 ? [[a, b, e], [a, e, d]] : [[a, b, d], [b, e, d]];
      for (const t of tris)
        shards.push({
          clip: `polygon(${t.map(([x, y]) => `${x}% ${y}%`).join(",")})`,
          cx: (t[0][0] + t[1][0] + t[2][0]) / 3,
          cy: (t[0][1] + t[1][1] + t[2][1]) / 3,
        });
    }
  return shards;
}

export function ClearOverlay() {
  const clear = useGame((s) => s.clear);
  const setClear = useGame((s) => s.setClear);
  const quest = useGame((s) => (clear ? s.state.quests.get(clear.questId) : undefined));

  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline>(undefined);
  const shards = useMemo(() => makeShards(clear?.questId ?? "x"), [clear?.questId]);

  const close = () => {
    if (tl.current && tl.current.progress() < 1) {
      tl.current.progress(1);
      return;
    }
    gsap.to(root.current, { opacity: 0, duration: 0.25, onComplete: () => setClear(undefined) });
  };

  useEffect(() => {
    if (!clear) return;
    const onKey = (e: KeyboardEvent) => {
      if (["Enter", "Escape", " ", "a", "b"].includes(e.key)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  useLayoutEffect(() => {
    if (!clear || !root.current) return;
    const { before, after } = clear;
    const el = root.current;
    const q = (s: string) => el.querySelector(s);
    const leveled = after.level > before.level;
    const counters = { xp: 0, gold: 0 };
    const setCounters = () => {
      q(".cl-xp")!.textContent = `+${Math.round(counters.xp).toLocaleString("es-ES")}`;
      q(".cl-gold")!.textContent = `+${Math.round(counters.gold).toLocaleString("es-ES")}`;
    };
    const ratio = (p: typeof before) => (p.levelXp / p.levelXpNeeded) * 100;

    const ctx = gsap.context(() => {
      const t = gsap.timeline();
      t.timeScale(1.25);
      tl.current = t;
      t.from(el, { opacity: 0, duration: 0.2 })
        // la tarjeta aparece, tiembla y se agrieta
        .from(".cl-card", { scale: 0.85, opacity: 0, duration: 0.35, ease: "back.out(2)" })
        .to(".cl-card", {
          keyframes: [
            { x: -6, duration: 0.04 }, { x: 6, duration: 0.04 }, { x: -4, duration: 0.04 },
            { x: 4, duration: 0.04 }, { x: 0, duration: 0.04 },
          ],
        }, "+=0.15")
        .fromTo(".cl-glow", { opacity: 0 }, { opacity: 1, duration: 0.2 }, "<")
        .add(() => sfx.shatter())
        // estallido en pedazos
        .to(".cl-shard", {
          x: (i) => (shards[i].cx - 50) * (5 + Math.random() * 4),
          y: (i) => (shards[i].cy - 50) * (4 + Math.random() * 4) + 120,
          rotation: () => (Math.random() - 0.5) * 220,
          opacity: 0,
          duration: 0.95,
          ease: "power2.out",
        })
        .fromTo(".cl-ring", { scale: 0.2, opacity: 0.9 }, { scale: 2.6, opacity: 0, duration: 0.7, ease: "power2.out" }, "<")
        .fromTo(".cl-sparks", { scale: 0.3, opacity: 1 }, { scale: 1.4, opacity: 0, duration: 0.6, ease: "power3.out" }, "<")
        // título
        .add(() => sfx.clear(), "-=0.55")
        .fromTo(".cl-rule", { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: "power3.out" }, "-=0.6")
        .fromTo(".cl-title", { letterSpacing: "0.9em", opacity: 0 }, { letterSpacing: "0.22em", opacity: 1, duration: 0.7, ease: "power3.out" }, "<")
        .from(".cl-sub", { opacity: 0, y: 8, duration: 0.3 }, "-=0.3")
        // recompensas
        .from(".cl-row", { opacity: 0, x: -16, stagger: 0.08, duration: 0.3 })
        .to(counters, {
          xp: after.xp - before.xp,
          gold: after.gold - before.gold,
          duration: 0.9,
          ease: "power2.out",
          onUpdate: setCounters,
        }, "<")
        .from(".cl-bar-wrap", { opacity: 0, duration: 0.25 }, "<");

      const fill = q(".cl-bar-fill");
      gsap.set(fill, { width: `${ratio(before)}%` });
      if (leveled) {
        t.to(fill, { width: "100%", duration: 0.6, ease: "power1.in" })
          .add(() => sfx.levelUp())
          .set(fill, { width: "0%" })
          .add(() => void (q(".cl-lv-num")!.textContent = String(after.level)))
          .fromTo(".cl-levelup", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(3)" })
          .fromTo(".cl-levelup-burst", { scale: 0.4, opacity: 1 }, { scale: 1.5, opacity: 0, duration: 0.7 }, "<")
          .to(fill, { width: `${ratio(after)}%`, duration: 0.5, ease: "power2.out" }, "<0.2");
      } else {
        t.to(fill, { width: `${ratio(after)}%`, duration: 0.7, ease: "power2.out" });
      }
      t.from(".cl-hint", { opacity: 0, duration: 0.4 });
    }, el);

    return () => ctx.revert();
  }, [clear, shards]);

  if (!clear || !quest) return null;
  const meta = CATEGORY_META[quest.category];
  const leveled = clear.after.level > clear.before.level;

  return (
    <div className="cl" ref={root} onClick={close} style={{ "--cat": meta.color } as React.CSSProperties}>
      <div className="cl-stage">
        <div className="cl-card">
          <div className="cl-glow" />
          {shards.map((s, i) => (
            <div key={i} className="cl-shard" style={{ clipPath: s.clip }}>
              <div className="card-inner cl-face">
                <span className="card-tag tag">{meta.tag}</span>
                <span className="card-gem gem" />
                <span className="card-title">{quest.title}</span>
                <span className="card-foot">
                  <span className="muted">{quest.kind}</span>
                  <b className="num">{quest.reward.xp}</b>
                  <span className="card-unit">XP</span>
                </span>
              </div>
            </div>
          ))}
          <div className="cl-ring" />
          <svg className="cl-sparks" viewBox="-100 -100 200 200" aria-hidden>
            {Array.from({ length: 22 }, (_, i) => {
              const a = (i / 22) * Math.PI * 2;
              const r = 60 + (i % 4) * 12;
              return <line key={i} x1={Math.cos(a) * 30} y1={Math.sin(a) * 30} x2={Math.cos(a) * r} y2={Math.sin(a) * r} />;
            })}
          </svg>
        </div>

        <div className="cl-head">
          <span className="cl-rule" />
          <h2 className="cl-title">Quest Clear</h2>
          <span className="cl-rule" />
        </div>
        <p className="cl-sub">«{quest.title}» completada</p>

        <div className="cl-rewards">
          <div className="cl-row">
            <span className="reward-ico xp">XP</span>
            <span className="lbl">Experiencia</span>
            <b className="num cl-xp">+0</b>
          </div>
          <div className="cl-row">
            <GoldIcon />
            <span className="lbl">Oro</span>
            <b className="num cl-gold">+0</b>
          </div>
          {quest.reward.item && (
            <div className="cl-row">
              <span className="reward-ico item">◈</span>
              <span className="lbl">Objeto</span>
              <b className="cl-item">{quest.reward.item}</b>
            </div>
          )}
          <div className="cl-bar-wrap">
            <span className="lbl">
              Nivel <b className="num cl-lv-num">{clear.before.level}</b>
            </span>
            <div className="cl-bar">
              <div className="cl-bar-fill" />
            </div>
            {leveled && (
              <div className="cl-levelup">
                <svg className="cl-levelup-burst" viewBox="-100 -100 200 200" aria-hidden>
                  {Array.from({ length: 16 }, (_, i) => {
                    const a = (i / 16) * Math.PI * 2;
                    return <line key={i} x1={Math.cos(a) * 40} y1={Math.sin(a) * 18} x2={Math.cos(a) * 95} y2={Math.sin(a) * 42} />;
                  })}
                </svg>
                Level Up!
              </div>
            )}
          </div>
        </div>

        <p className="cl-hint">
          Pulsa <kbd>Enter</kbd> para continuar
        </p>
      </div>
    </div>
  );
}

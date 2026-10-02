import { forwardRef, useLayoutEffect, useMemo, useRef } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import gsap from "gsap";
import type { QuestState, QuestStatus } from "../domain/types";
import { CATEGORY_META, isPomodoroCondition } from "../domain/types";
import { seededRandom } from "../lib/id";
import { sfx } from "../lib/sfx";
import { formatRemaining } from "../lib/time";
import { num } from "../i18n";
import { PomodoroBadge } from "../features/pomodoro";

interface Props {
  quest: QuestState;
  status: QuestStatus;
  selected: boolean;
  now: number;
  onSelect(): void;
}

/** Líneas tipo mapa/grieta, estables por quest, que aparecen al aceptarla. */
function useCracks(id: string) {
  return useMemo(() => {
    const rnd = seededRandom(id);
    const paths: string[] = [];
    for (let i = 0; i < 6; i++) {
      const fromLeft = rnd() < 0.5;
      let x = fromLeft ? 40 + rnd() * 60 : 200;
      let y = fromLeft ? (rnd() < 0.5 ? 0 : 100) : rnd() * 100;
      let a = Math.atan2(55 - y, 140 - x) + (rnd() - 0.5) * 1.6;
      let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
      const steps = 4 + Math.floor(rnd() * 5);
      for (let s = 0; s < steps; s++) {
        a += (rnd() - 0.5) * 1.1;
        const len = 10 + rnd() * 22;
        x += Math.cos(a) * len;
        y += Math.sin(a) * len;
        d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      paths.push(d);
    }
    const ring = { cx: 150 + rnd() * 20, cy: 70 + rnd() * 10, r: 14 + rnd() * 6 };
    return { paths, ring };
  }, [id]);
}

const BURST = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2 + (i % 2 ? 0.12 : 0);
  const r1 = 20 + (i % 3) * 3;
  const r2 = r1 + 10 + ((i * 7) % 5) * 3;
  return [Math.cos(a) * r1, Math.sin(a) * r1, Math.cos(a) * r2, Math.sin(a) * r2];
});

export const QuestCard = forwardRef<HTMLButtonElement, Props>(function QuestCard(
  { quest, status, selected, now, onSelect },
  outerRef,
) {
  const meta = CATEGORY_META[quest.category];
  const { t } = useTranslation();
  const cracks = useCracks(quest.id);

  const cardRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLDivElement>(null);
  const burstRef = useRef<SVGGElement>(null);
  const cracksRef = useRef<SVGSVGElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const prevStatus = useRef(status);

  useLayoutEffect(() => {
    const was = prevStatus.current;
    prevStatus.current = status;
    const active = status === "active";
    const crackEls = cracksRef.current?.querySelectorAll("path, circle") ?? [];

    // Sin transición: dejar sello y grietas en su estado final.
    if (!active || was === "active") {
      gsap.set(stampRef.current, { opacity: active ? 1 : 0, scale: 1, rotate: -9 });
      gsap.set(cracksRef.current, { opacity: active ? 1 : 0 });
      gsap.set(crackEls, { strokeDashoffset: 0 });
      return;
    }

    const tl = gsap.timeline();
    tl.set(cracksRef.current, { opacity: 1 }).fromTo(
      stampRef.current,
      { scale: 2.8, opacity: 0, rotate: -30 },
      { scale: 1, opacity: 1, rotate: -9, duration: 0.2, ease: "power4.in" },
    )
      .add(() => sfx.stamp())
      .to(cardRef.current, {
        keyframes: [
          { x: -5, y: 3, duration: 0.04 },
          { x: 4, y: -2, duration: 0.05 },
          { x: -2, y: 1, duration: 0.05 },
          { x: 0, y: 0, duration: 0.06 },
        ],
      })
      .fromTo(
        burstRef.current,
        { scale: 0.5, opacity: 1, transformOrigin: "50% 50%" },
        { scale: 1.6, opacity: 0, duration: 0.55, ease: "power2.out" },
        "<",
      )
      .fromTo(flashRef.current, { opacity: 0.55 }, { opacity: 0, duration: 0.45 }, "<")
      .fromTo(
        crackEls,
        { strokeDashoffset: 1 },
        { strokeDashoffset: 0, duration: 0.8, stagger: 0.05, ease: "power3.out" },
        "<",
      );
    return () => {
      tl.kill();
    };
  }, [status]);

  const isActive = status === "active";
  const isCooldown = status === "cooldown";

  return (
    <motion.button
      ref={outerRef}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      className={`card ${selected ? "is-selected" : ""} ${isActive ? "is-active" : ""} ${isCooldown ? "is-cooldown" : ""}`}
      style={{ "--cat": meta.color } as React.CSSProperties}
      onClick={onSelect}
    >
      <div className="card-inner" ref={cardRef}>
        <svg
          ref={cracksRef}
          className="card-cracks"
          viewBox="0 0 200 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          {cracks.paths.map((d, i) => (
            <path key={i} d={d} pathLength={1} strokeDasharray="1 2" />
          ))}
          <circle
            cx={cracks.ring.cx}
            cy={cracks.ring.cy}
            r={cracks.ring.r}
            pathLength={1}
            strokeDasharray="1 2"
          />
        </svg>

        <span className="card-tag tag">{meta.tag}</span>
        <span className="card-gem gem" />
        <span className="card-title">{quest.title}</span>
        <span className="card-foot">
          <span className="muted">{quest.kind}</span>
          <b className="num">{num(quest.reward.xp)}</b>
          <span className="card-unit">XP</span>
        </span>

        {isCooldown && <span className="card-cd">{t("card.backIn", { time: formatRemaining((quest.availableAt ?? 0) - now) })}</span>}
        {quest.completions > 0 && !isCooldown && !isActive && <span className="card-count">×{quest.completions}</span>}
        {quest.conditions.some(isPomodoroCondition) && <PomodoroBadge quest={quest} />}

        <div className="card-flash" ref={flashRef} />
        <div className="stamp-wrap">
          <svg className="burst" viewBox="-50 -50 100 100" aria-hidden>
            <g ref={burstRef} opacity={0}>
              {BURST.map(([x1, y1, x2, y2], i) => (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
              ))}
            </g>
          </svg>
          <div ref={stampRef} className="stamp">
            {t("card.stamp")}
          </div>
        </div>
      </div>
    </motion.button>
  );
});

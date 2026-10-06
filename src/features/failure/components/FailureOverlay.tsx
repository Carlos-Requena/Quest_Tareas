import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import gsap from "gsap";
import { useGame } from "../../../store/game";
import { CATEGORY_META, type QuestState } from "../../../domain/types";
import { sfx } from "../../../lib/sfx";
import { burst, calm, quake } from "../../../lib/fx";
import { seededRandom } from "../../../lib/id";
import { num } from "../../../i18n";
import { tornEdge } from "../../temporal/look";
import { Skull } from "../../temporal/components/Skull";
import type { TemporalState } from "../../temporal/model";
import { KeyHint } from "../../mobile";
import { repostQuest, repostTemporal } from "../actions";
import { useFailureUi } from "../ui";
import "../failure.css";

/**
 * Lo que ha fallado, de uno en uno: la quest se fractura y cae en pedazos; el cartel del
 * encargo arde desde abajo y se convierte en ceniza. Se puede saltar (clic o Enter) y,
 * después, volver a clavar una copia o seguir.
 */
export function FailureOverlay() {
  const head = useFailureUi((s) => s.queue[0]);
  const left = useFailureUi((s) => s.queue.length);
  const quest = useGame((s) => (head?.kind === "quest" ? s.state.quests.get(head.id) : undefined));
  const temporal = useGame((s) => (head?.kind === "temporal" ? s.state.temporals.get(head.id) : undefined));
  const lost = useGame((s) => (temporal ? temporal.questIds.filter((id) => s.state.quests.get(id)?.failedAt !== undefined).length : 0));

  // Si lo que había que enseñar ya no existe (se retiró), pasa al siguiente.
  useEffect(() => {
    if (head && !quest && !temporal) useFailureUi.getState().next();
  }, [head, quest, temporal]);

  if (!head || (!quest && !temporal)) return null;
  return <Scene key={`${head.kind}:${head.id}`} quest={quest} temporal={temporal} lost={lost} more={left - 1} />;
}

/** Pedazos de la tarjeta: una rejilla de 4 × 3 con los vértices movidos, cada celda en dos triángulos. */
function useShards(seed: string) {
  return useMemo(() => {
    const rnd = seededRandom(`${seed}:shards`);
    const cols = 4;
    const rows = 3;
    const pt = (c: number, r: number) => {
      const inner = c > 0 && c < cols && r > 0 && r < rows;
      const x = (c / cols) * 100 + (inner ? (rnd() - 0.5) * 14 : 0);
      const y = (r / rows) * 100 + (inner ? (rnd() - 0.5) * 18 : 0);
      return [x, y] as const;
    };
    const grid = Array.from({ length: rows + 1 }, (_, r) => Array.from({ length: cols + 1 }, (_, c) => pt(c, r)));
    const out: { clip: string; cx: number; cy: number }[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const [a, b, d, e] = [grid[r][c], grid[r][c + 1], grid[r + 1][c], grid[r + 1][c + 1]];
        const tris = rnd() < 0.5 ? [[a, b, e], [a, e, d]] : [[a, b, d], [b, e, d]];
        for (const t of tris)
          out.push({
            clip: `polygon(${t.map(([x, y]) => `${x.toFixed(1)}% ${y.toFixed(1)}%`).join(", ")})`,
            cx: (t[0][0] + t[1][0] + t[2][0]) / 3,
            cy: (t[0][1] + t[1][1] + t[2][1]) / 3,
          });
      }
    return out;
  }, [seed]);
}

/** Grietas que salen de un punto de impacto. */
function useCracks(seed: string) {
  return useMemo(() => {
    const rnd = seededRandom(`${seed}:fcracks`);
    const ox = 40 + rnd() * 20;
    const oy = 40 + rnd() * 20;
    return Array.from({ length: 7 }, (_, i) => {
      let a = (i / 7) * Math.PI * 2 + rnd() * 0.6;
      let x = ox;
      let y = oy;
      let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
      for (let s = 0; s < 5; s++) {
        a += (rnd() - 0.5) * 0.9;
        x += Math.cos(a) * (8 + rnd() * 12);
        y += Math.sin(a) * (6 + rnd() * 10);
        d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      return d;
    });
  }, [seed]);
}

function CardFace({ q }: { q: QuestState }) {
  return (
    <div className="fo-face">
      <span className="fo-face-tag">{CATEGORY_META[q.category].tag}</span>
      <span className="fo-face-title">{q.title}</span>
      <span className="fo-face-foot">
        <b className="num">{num(q.reward.xp)}</b> XP
      </span>
    </div>
  );
}

function Scene({ quest, temporal, lost, more }: { quest?: QuestState; temporal?: TemporalState; lost: number; more: number }) {
  const { t: tr } = useTranslation();
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline>(undefined);
  const [done, setDone] = useState(false);
  const id = quest?.id ?? temporal!.id;
  const shards = useShards(id);
  const cracks = useCracks(id);
  const clip = useMemo(() => tornEdge(`${id}:burn`, 12, 40), [id]);

  /** Estado final, sin animación (al saltar). */
  const settle = () => {
    const el = root.current;
    if (!el) return;
    tl.current?.kill();
    gsap.set(el.querySelectorAll(".fo-shard"), { opacity: 0 });
    gsap.set(el.querySelectorAll(".fo-card"), { opacity: 0 });
    gsap.set(el.querySelector(".fo-poster"), { "--burn": "110%" });
    gsap.set(el.querySelectorAll(".fo-title, .fo-sub, .fo-actions"), { opacity: 1, scale: 1, y: 0 });
    setDone(true);
  };

  const close = () => {
    sfx.move();
    useFailureUi.getState().next();
  };

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const layer = el.querySelector<HTMLElement>(".fo-fx")!;
    const stage = el.querySelector<HTMLElement>(".fo-stage");
    const soft = calm();
    const ctx = gsap.context(() => {
      const T = gsap.timeline({ onComplete: () => setDone(true) });
      tl.current = T;
      T.fromTo(".fo-bg", { opacity: 0 }, { opacity: 1, duration: 0.3 });

      if (quest) {
        const card = el.querySelector<HTMLElement>(".fo-card")!;
        const rect = () => card.getBoundingClientRect();
        T.fromTo(card, { y: -30, opacity: 0, scale: 1.06 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.6)" })
          .to({}, { duration: 0.35 })
          // Primera grieta: crujido y temblor.
          .add(() => {
            sfx.fracture(0);
            if (!soft) quake(stage, 6, 0.3);
          })
          .fromTo(".fo-crack path", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.45, stagger: 0.04, ease: "power2.out" })
          .fromTo(".fo-card-flash", { opacity: 0.6 }, { opacity: 0, duration: 0.4 }, "<")
          .to({}, { duration: 0.35 })
          // Se rompe: los pedazos toman el sitio de la tarjeta y caen.
          .add(() => {
            sfx.fracture(1);
            if (!soft) quake(stage, 14, 0.5);
            const r = rect();
            const lr = layer.getBoundingClientRect();
            burst({ layer, x: [r.left - lr.left + 20, r.right - lr.left - 20], y: r.top - lr.top + r.height / 2, count: 26, kind: "glow", color: "var(--ash)", gravity: 600, velocity: [80, 260], angle: [-170, -10] });
          })
          .set(card, { opacity: 0 })
          .set(".fo-shard", { opacity: 1 }, "<");
        el.querySelectorAll<HTMLElement>(".fo-shard").forEach((s, i) => {
          const sh = shards[i];
          const dx = (sh.cx - 50) * (soft ? 0.4 : 3.2) + gsap.utils.random(-30, 30);
          T.to(
            s,
            {
              x: dx,
              y: gsap.utils.random(420, 760),
              rotation: gsap.utils.random(-140, 140),
              opacity: 0,
              duration: gsap.utils.random(1, 1.5),
              ease: "power2.in",
            },
            `<+${i === 0 ? 0 : 0.012}`,
          );
        });
        T.addLabel("text", "-=1.1");
      } else {
        const poster = el.querySelector<HTMLElement>(".fo-poster")!;
        const dur = soft ? 1.2 : 2.6;
        T.fromTo(poster, { y: -40, opacity: 0, rotate: -3 }, { y: 0, opacity: 1, rotate: 0, duration: 0.45, ease: "power3.out" })
          .to({}, { duration: 0.3 })
          .add(() => sfx.burn(dur))
          .fromTo(".fo-glow", { opacity: 0 }, { opacity: 1, duration: 0.3 })
          // El fuego sube por el cartel: la línea de la brasa y lo que ya es ceniza siguen a --burn.
          .fromTo(poster, { "--burn": "-6%" }, { "--burn": "110%", duration: dur, ease: "power1.inOut" }, "<");
        // Ascuas que salen de la línea del fuego mientras arde.
        const embers = gsap.timeline({ repeat: Math.round(dur / 0.14), defaults: { duration: 0 } });
        embers.add(() => {
          const r = poster.getBoundingClientRect();
          const lr = layer.getBoundingClientRect();
          const burnt = parseFloat(getComputedStyle(poster).getPropertyValue("--burn")) || 0;
          const y = r.bottom - lr.top - (r.height * Math.max(0, Math.min(100, burnt))) / 100;
          burst({ layer, x: [r.left - lr.left + 10, r.right - lr.left - 10], y, count: soft ? 2 : 6, kind: "spark", color: "var(--fire)", gravity: -260, velocity: [40, 140], angle: [-120, -60], duration: [0.8, 1.6] });
        }, 0.14);
        T.add(embers, "<");
        T.add(() => burst({ layer, x: [layer.clientWidth / 2 - 140, layer.clientWidth / 2 + 140], y: layer.clientHeight / 2, count: 30, kind: "glow", color: "var(--ash)", gravity: 120, velocity: [10, 60], angle: [60, 120], duration: [1.4, 2.4] }), `-=${dur * 0.25}`)
          .to(".fo-glow", { opacity: 0, duration: 0.5 }, "-=0.4")
          .addLabel("text", `-=${dur * 0.55}`);
      }

      T.fromTo(".fo-title", { opacity: 0, scale: 2.2 }, { opacity: 1, scale: 1, duration: 0.35, ease: "power4.in" }, "text")
        .fromTo(".fo-sub", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35 }, "text+=0.3")
        .fromTo(".fo-actions", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 }, "text+=0.5");
    }, el);
    return () => {
      tl.current?.kill();
      ctx.revert();
    };
    // Solo al montar: cada fallo es una escena nueva (key).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== "Escape" && e.key !== " ") return;
      e.preventDefault();
      e.stopPropagation();
      if (!done) settle();
      else close();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  const title = quest?.title ?? temporal!.title;
  return (
    <div className={`fo ${quest ? "is-quest" : "is-temporal"}`} ref={root} onClick={() => (done ? undefined : settle())} role="dialog" aria-label={quest ? "Quest failed" : "Burned"}>
      <div className="fo-bg" />
      <div className="fo-stage">
        {quest ? (
          <div className="fo-cardwrap" style={{ "--cat": CATEGORY_META[quest.category].color } as React.CSSProperties}>
            <div className="fo-card">
              <CardFace q={quest} />
              <svg className="fo-crack" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                {cracks.map((d, i) => (
                  <path key={i} d={d} pathLength={1} strokeDasharray="1 1" />
                ))}
              </svg>
              <div className="fo-card-flash" />
            </div>
            {shards.map((s, i) => (
              <div key={i} className="fo-shard" style={{ clipPath: s.clip }}>
                <CardFace q={quest} />
              </div>
            ))}
          </div>
        ) : (
          <div className="fo-posterwrap">
            <div className="fo-glow" />
            <div className="fo-poster">
              <div className="fo-paper" style={{ clipPath: clip }}>
                <span className="fo-kind">{tr(`temporal.kinds.${temporal!.kind}`)}</span>
                <span className="fo-ptitle">{temporal!.title}</span>
                <span className="fo-skulls">
                  {Array.from({ length: temporal!.difficulty }, (_, i) => (
                    <Skull key={i} />
                  ))}
                </span>
                <div className="fo-char" />
              </div>
              <div className="fo-edge" />
            </div>
          </div>
        )}

        <div className="fo-text">
          <h2 className="fo-title">{quest ? "Quest Failed" : "Burned"}</h2>
          <p className="fo-sub">
            {quest ? tr("failure.quest.subtitle", { title }) : tr("failure.temporal.subtitle", { title })}
            {temporal && lost > 0 && <span className="fo-lost">{tr("failure.temporal.lost", { count: lost })}</span>}
          </p>
          <div className="fo-actions" onClick={(e) => e.stopPropagation()}>
            <button
              className="btn btn-ghost"
              onClick={() => {
                useFailureUi.getState().next();
                if (quest) repostQuest(quest.id);
                else repostTemporal(temporal!.id);
              }}
            >
              {tr("failure.repost")}
            </button>
            <button className="btn btn-primary is-ready" onClick={close}>
              {more > 0 ? tr("failure.next", { count: more }) : tr("failure.continue")}
            </button>
          </div>
          <p className="fo-hint muted">
            <KeyHint i18nKey="failure.hint" touch="continue" />
          </p>
        </div>
      </div>
      <div className="fo-fx" />
    </div>
  );
}

import { forwardRef, useLayoutEffect, useMemo, useRef } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import gsap from "gsap";
import { num } from "../../../i18n";
import { sfx } from "../../../lib/sfx";
import { burst, calm } from "../../../lib/fx";
import { useGame } from "../../../store/game";
import { KIND_META, isAccepted, linkedQuests, pendingLinks, type TemporalState } from "../model";
import { posterLook } from "../look";
import { dueChip, sealDate, shortDue } from "../format";
import { useTemporalUi } from "../ui";
import { Skull } from "./Skull";
import { isPhone } from "../../mobile";

interface Props {
  t: TemporalState;
  now: number;
  index: number;
  selected: boolean;
  onSelect(): void;
  onOpen(el: HTMLElement): void;
}

/** Alto de cada fila de la rejilla del tablón (px): los carteles ocupan varias filas según su forma. */
export const ROW = 10;

/**
 * Cartel de pergamino clavado en el tablón: cabecera del tipo, dibujo (si tiene una
 * imagen adjunta), título, fecha, recompensa y las calaveras de su dificultad
 * pisando el borde como sellos de lacre.
 */
export const Poster = forwardRef<HTMLButtonElement, Props>(function Poster({ t, now, index, selected, onSelect, onOpen }, outerRef) {
  const { t: tr } = useTranslation();
  const look = useMemo(() => posterLook(t), [t]);
  const meta = KIND_META[t.kind];
  const chip = dueChip(t, now);
  const sketch = t.attachments.find((a) => a.thumb);
  const pdfs = t.attachments.length;
  const landscape = look.shape === "landscape";
  // Quests enlazadas: cuántas hay y cuántas faltan (el encargo no se cumple hasta terminarlas).
  const linked = useGame((s) => linkedQuests(t, s.state.quests).length);
  const missing = useGame((s) => (t.status === "pending" ? pendingLinks(t, s.state.quests).length : 0));
  const rows = landscape ? 25 : sketch ? 31 : 25;

  const hang = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLSpanElement>(null);
  const sealRef = useRef<HTMLSpanElement>(null);
  const accepted = t.status === "pending" && isAccepted(t);
  const wasAccepted = useRef(accepted);
  const landed = useTemporalUi((s) => (s.landed?.id === t.id ? s.landed.key : undefined));
  const farewell = useTemporalUi((s) => (s.farewell?.id === t.id ? s.farewell.key : undefined));
  // Mientras dura la animación de «cartel clavado», el cartel aún no está en el tablón: llega al final.
  const arriving = useTemporalUi((s) => s.posted === t.id && s.landed?.id !== t.id);

  // Recién clavado: cae desde arriba, rebota y la chincheta se clava (con polvo).
  useLayoutEffect(() => {
    if (!landed || !hang.current) return;
    const el = hang.current;
    const tl = gsap.timeline();
    tl.fromTo(
      el,
      { y: -70, scale: 1.25, rotation: look.rotate - 14, opacity: 0 },
      { y: 0, scale: 1, rotation: look.rotate, opacity: 1, duration: 0.42, ease: "back.out(1.6)", clearProps: "transform,opacity" },
    ).add(() => {
      sfx.pin();
      const layer = el.querySelector<HTMLElement>(".tp-dust");
      if (layer && !calm()) burst({ layer, x: layer.clientWidth / 2, y: 6, count: 10, kind: "glow", color: "var(--paper-edge)", velocity: [40, 110], angle: [-170, -10], gravity: 160, duration: [0.5, 0.9], size: [5, 10] });
    }, 0.2);
    return () => {
      tl.kill();
    };
  }, [landed, look.rotate]);

  // Sello «ACCEPTED»: se estampa al aceptarlo (también si llega de otro equipo). Si el
  // cartel está abierto en grande, el sello lo pone la vista grande y aquí solo se fija.
  useLayoutEffect(() => {
    const el = sealRef.current;
    if (!el) return;
    const was = wasAccepted.current;
    wasAccepted.current = accepted;
    if (accepted && !was && useTemporalUi.getState().viewing?.id !== t.id) {
      const tl = gsap.timeline();
      tl.fromTo(el, { scale: 2.4, opacity: 0, rotation: 24 }, { scale: 1, opacity: 0.9, rotation: 9, duration: 0.22, ease: "power4.in" })
        .add(() => sfx.stamp())
        .to(hang.current, { keyframes: [{ x: -3 }, { x: 3 }, { x: 0 }], duration: 0.16 });
      return () => {
        tl.kill();
      };
    }
    gsap.set(el, { opacity: accepted ? 0.9 : 0, scale: 1, rotation: 9 });
  }, [accepted, t.id]);

  // Recién cumplido: el sello «CLEAR» cae sobre el cartel antes de que se descuelgue.
  useLayoutEffect(() => {
    if (!farewell || !stampRef.current) return;
    const tl = gsap.timeline();
    tl.fromTo(stampRef.current, { scale: 2.6, opacity: 0, rotation: -32 }, { scale: 1, opacity: 1, rotation: -14, duration: 0.22, ease: "power4.in" })
      .add(() => sfx.stamp())
      .to(hang.current, { keyframes: [{ x: -4 }, { x: 4 }, { x: -2 }, { x: 0 }], duration: 0.2 });
    return () => {
      tl.kill();
    };
  }, [farewell]);

  return (
    <motion.button
      ref={outerRef}
      layout
      data-tid={t.id}
      className={`tp tp-${look.shape} is-${chip.urgency} ${selected ? "is-selected" : ""} ${meta.red ? "is-red" : ""} ${t.status === "pending" && !accepted ? "is-planned" : ""}`}
      style={
        {
          gridColumn: landscape ? "span 2" : "span 1",
          gridRow: `span ${rows}`,
          "--rot": `${look.rotate}deg`,
          "--dx": `${look.dx}px`,
          "--dy": `${look.dy}px`,
        } as React.CSSProperties
      }
      initial={{ opacity: 0, y: -26, scale: 1.04 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      // Al descolgarse (retirado o cumplido): se despega un poco, gira y cae.
      exit={{
        opacity: [1, 1, 0],
        y: [0, -10, 130],
        rotate: [0, -5, 24],
        scale: [1, 1.04, 0.92],
        transition: { duration: 0.7, times: [0, 0.18, 1], ease: "easeIn" },
      }}
      transition={{ type: "spring", stiffness: 260, damping: 22, delay: Math.min(index, 14) * 0.045 }}
      onClick={(e) => {
        // En el teléfono no hay doble clic ni teclas: un toque abre el cartel.
        if (selected || isPhone()) onOpen(e.currentTarget);
        else onSelect();
      }}
      onDoubleClick={(e) => onOpen(e.currentTarget)}
    >
      <div className="tp-hang" ref={hang} style={arriving ? { visibility: "hidden" } : undefined}>
        <div className="tp-paper" style={{ clipPath: look.clip }}>
          <div className="tp-frame">
            {landscape ? (
              <div className="tp-headrow">
                <span className="tp-guild">Adventurers</span>
                <span className="tp-kind">{meta.tag}</span>
                <span className="tp-guild">Guild</span>
              </div>
            ) : (
              <>
                <span className="tp-guild">Adventurers Guild</span>
                <span className="tp-kind">{meta.tag}</span>
              </>
            )}
            <div className="tp-body">
              <div className="tp-text">
                <span className="tp-title">{t.title}</span>
                <span className="tp-when">{shortDue(t)}</span>
                <span className="tp-reward num">
                  {num(t.reward.gold)} <small>G</small>
                </span>
              </div>
              {sketch && (
                <div className="tp-sketch">
                  <img src={sketch.thumb} alt="" draggable={false} />
                </div>
              )}
            </div>
            <span className="tp-ribbon">{t.place || "Enquire within"}</span>
          </div>
          <span className="tp-clear" ref={stampRef}>
            Clear
          </span>
          <span className="tp-seal" ref={sealRef} aria-hidden>
            Accepted
            <small className="num">{t.acceptedAt !== undefined ? sealDate(t.acceptedAt) : ""}</small>
          </span>
        </div>
        <span className="tp-tack" />
        <span className={`tp-chip is-${chip.urgency}`}>{chip.label}</span>
        {pdfs > 0 && (
          <span className="tp-clip" title={tr("temporal.view.attachments")}>
            <ClipIcon />
            <b className="num">{pdfs}</b>
          </span>
        )}
        {linked > 0 && (
          <span className={`tp-quests ${missing ? "" : "is-ready"} ${pdfs > 0 ? "after-clip" : ""}`} title={tr("temporal.quests.badge")}>
            <SwordIcon />
            <b className="num">
              {linked - missing}/{linked}
            </b>
          </span>
        )}
        <div className="tp-skulls">
          {look.skulls.map((s, i) => (
            <Skull
              key={i}
              className={t.status === "done" ? "skull-gold" : ""}
              style={{ left: `${s.x}%`, top: `${s.y}%`, transform: `translate(-50%, -50%) rotate(${s.rotate}deg) scale(${s.scale})` }}
            />
          ))}
        </div>
        <div className="tp-dust" />
      </div>
    </motion.button>
  );
});

export function ClipIcon() {
  return (
    <svg viewBox="0 0 16 24" className="clip-ico" aria-hidden>
      <path d="M11 6v11a3.5 3.5 0 0 1-7 0V5a2.3 2.3 0 0 1 4.6 0v11a1.1 1.1 0 0 1-2.2 0V7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Espada pequeña: las quests de un encargo. */
export function SwordIcon() {
  return (
    <svg viewBox="0 0 16 16" className="sword-ico" aria-hidden>
      <path d="M13.8 1.6 7 8.4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M14.4 1 12 1.6l2.4.6Z" fill="currentColor" />
      <path d="M4.2 8.6l3.2 3.2M5.4 10.6l-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="2.1" cy="13.9" r="1.1" fill="currentColor" />
    </svg>
  );
}

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { animate, motion, useMotionValue, useTransform, useVelocity } from "motion/react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { useNow } from "../../../lib/time";
import { sfx } from "../../../lib/sfx";
import { calm } from "../../../lib/fx";
import { haptic } from "../../../lib/haptics";
import { Skull, needsAttention, switchSection, useTemporalUi } from "../../temporal";
import { CalendarIcon, addBlock, useCalendarUi } from "../../calendar";
import { MenuIcon, toggleMenu, useMenuUi } from "../../menu";
import { useMobileUi } from "../ui";
import { useQuickUi } from "../../quickadd/ui";
import "../mobile.css";

/** Lo que hace cada botón de la barra, por orden. */
type Tab = "board" | "temporal" | "calendar" | "menu";
const TABS: Tab[] = ["board", "temporal", "calendar", "menu"];
/** Relleno de la cápsula (mobile.css, .mnav): la lente se mueve dentro. */
const PAD = 4;
/** A partir de cuántos px el toque pasa a ser arrastrar la lente. */
const SCRUB = 6;
const SPRING = { type: "spring", stiffness: 520, damping: 38, mass: 0.8 } as const;

/**
 * Barra de abajo del teléfono, en lugar del pie con las teclas: los dos tablones, el calendario
 * y el menú de opciones (features/menu), donde están el mercader, el personaje, los objetos, la
 * crónica y los ajustes. Una cápsula de cristal que flota en todas las pantallas (también sobre
 * el menú), con una lente que se queda en la sección activa. Como la barra de iOS: al mantener
 * el dedo la lente crece, se arrastra de pestaña en pestaña (estirándose con la velocidad, con
 * un toque de vibración en cada una) y al soltar lleva a la que tiene debajo. En el escritorio
 * no se ve (CSS).
 */
export function MobileNav() {
  const section = useGame((s) => s.section);
  const temporals = useGame((s) => s.state.temporals);
  const menu = useMenuUi((s) => s.open);
  const now = useNow(60_000);
  const { t } = useTranslation();
  const urgent = useMemo(() => needsAttention(temporals.values(), now), [temporals, now]);
  const active = menu ? 3 : Math.max(0, TABS.indexOf(section as Tab));

  const go = (target: Tab) => {
    if (target === "menu") return toggleMenu();
    useMobileUi.getState().closeDetail();
    useMenuUi.getState().setOpen(false);
    if (target === section) sfx.move();
    else switchSection(target);
  };

  const navRef = useRef<HTMLElement>(null);
  const col = useRef(0);
  const x = useMotionValue(0);
  const lift = useMotionValue(1);
  // Lo «líquido»: la lente se estira en la dirección en que va y se aplana un poco.
  const vx = useVelocity(x);
  const stretch = useTransform(vx, [-2400, 0, 2400], [1.32, 1, 1.32], { clamp: true });
  const squash = useTransform(vx, [-2400, 0, 2400], [0.86, 1, 0.86], { clamp: true });
  const [under, setUnder] = useState<number>();
  const press = useRef<{ id: number; x0: number; scrub: boolean; at: number } | undefined>(undefined);
  const handledAt = useRef(0);
  const still = calm();

  const place = (i: number, instant = false) => {
    const to = i * col.current;
    if (instant || still) x.set(to);
    else animate(x, to, SPRING);
  };

  // El ancho de cada pestaña cambia con la pantalla: la lente se recoloca.
  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const measure = () => {
      col.current = (el.clientWidth - PAD * 2) / TABS.length;
      if (!press.current) place(active, true);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // La sección cambia (también desde fuera de la barra): la lente va a ella.
  useEffect(() => {
    if (!press.current) place(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  /** Qué pestaña queda bajo el dedo, y la lente centrada en él (sin salirse de la cápsula). */
  const follow = (clientX: number) => {
    const el = navRef.current;
    if (!el) return 0;
    const left = clientX - el.getBoundingClientRect().left - PAD;
    const i = Math.min(TABS.length - 1, Math.max(0, Math.floor(left / col.current)));
    x.set(Math.min(col.current * (TABS.length - 1), Math.max(0, left - col.current / 2)));
    return i;
  };

  const release = (to: number | undefined) => {
    press.current = undefined;
    setUnder(undefined);
    if (!still) animate(lift, 1, SPRING);
    place(to ?? active);
  };

  return (
    <nav
      ref={navRef}
      className={`mnav ${under !== undefined ? "is-pressed" : ""}`}
      aria-label={t("mobile.nav.label")}
      onPointerDown={(e) => {
        // Con el ratón, los botones de siempre; con el dedo, la lente.
        if (e.pointerType === "mouse" || press.current) return;
        press.current = { id: e.pointerId, x0: e.clientX, scrub: false, at: performance.now() };
        try {
          navRef.current?.setPointerCapture(e.pointerId);
        } catch {
          // Sin captura, el arrastre se corta si el dedo sale de la barra.
        }
        const i = follow(e.clientX);
        setUnder(i);
        if (!still) animate(lift, 1.14, SPRING);
      }}
      onPointerMove={(e) => {
        const p = press.current;
        if (!p || p.id !== e.pointerId) return;
        if (!p.scrub && Math.abs(e.clientX - p.x0) < SCRUB) return;
        p.scrub = true;
        const i = follow(e.clientX);
        if (i !== under) {
          setUnder(i);
          haptic.selection();
        }
      }}
      onPointerUp={(e) => {
        const p = press.current;
        if (!p || p.id !== e.pointerId) return;
        const i = follow(e.clientX);
        handledAt.current = performance.now();
        release(i);
        go(TABS[i]);
      }}
      onPointerCancel={() => release(undefined)}
      // El dedo ya navegó al soltar: el clic que llega detrás sobra.
      onClickCapture={(e) => {
        if (performance.now() - handledAt.current > 500) return;
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* La lente: una sola, que se mueve con el dedo o va con un muelle a la sección activa. */}
      <motion.span className="mnav-lens" aria-hidden style={{ x, scale: lift }}>
        <motion.span className="mnav-lens-in" style={still ? undefined : { scaleX: stretch, scaleY: squash }} />
      </motion.span>
      <NavButton on={active === 0} under={under === 0} label={t("mobile.nav.board")} onClick={() => go("board")} icon={<span className="gem" />} />
      <NavButton
        on={active === 1}
        under={under === 1}
        label={t("mobile.nav.temporal")}
        onClick={() => go("temporal")}
        icon={<Skull />}
        badge={urgent > 0 ? urgent : undefined}
      />
      <NavButton on={active === 2} under={under === 2} label={t("calendar.title")} onClick={() => go("calendar")} icon={<CalendarIcon />} />
      <NavButton on={active === 3} under={under === 3} label={t("menu.open")} onClick={() => go("menu")} icon={<MenuIcon />} />
    </nav>
  );
}

function NavButton({ on, under, label, icon, badge, onClick }: { on?: boolean; under?: boolean; label: string; icon: ReactNode; badge?: number; onClick: () => void }) {
  return (
    <button className={`mnav-btn ${on ? "on" : ""} ${under ? "is-under" : ""}`} aria-current={on ? "page" : undefined} onClick={onClick}>
      <span className="mnav-ico">
        {icon}
        {badge !== undefined && <span className="mnav-badge num">{badge}</span>}
      </span>
      <span className="mnav-lbl">{label}</span>
    </button>
  );
}

/** Botón flotante para crear: una quest en el tablón o un encargo en el de encargos. */
export function MobileCreate() {
  const section = useGame((s) => s.section);
  const detail = useMobileUi((s) => s.detail !== undefined);
  const { t } = useTranslation();
  if (detail) return null;
  const label = section === "temporal" ? t("temporal.footer.new") : section === "calendar" ? t("calendar.footer.new") : t("footer.newQuest");
  return (
    <button
      className="mfab"
      aria-label={label}
      title={label}
      onClick={() => {
        sfx.move();
        if (section === "temporal") useTemporalUi.getState().setForm({ mode: "create" });
        else if (section === "calendar") addBlock(useCalendarUi.getState().day);
        // En el tablón, la línea rápida (features/quickadd); desde ella, «Más detalles» abre el formulario.
        else useQuickUi.getState().setSheet(true);
      }}
    >
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
        <path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
}

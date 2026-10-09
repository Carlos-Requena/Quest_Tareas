import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { calm } from "../../../lib/fx";
import { toggleLang } from "../../../i18n";
import { Toast } from "../../../components/QuestDetail";
import { music } from "../../music";
import { openMerchant } from "../../merchant";
import { Backdrop, openCharacter } from "../../equipment";
import { openChronicle } from "../../chronicle";
import { closeMenu, openOver, searchFromMenu, windowOpen } from "../actions";
import { menuBusy, useMenuUi } from "../ui";
import { MenuTiles } from "./MenuTiles";
import { MenuSettings } from "./MenuSettings";
import { MenuBack, MenuCurrency, MenuPlayer, MenuVoice, WeeklyNews } from "./MenuPanels";
import { Sigil } from "./MenuIcons";
import { LivingCharacter, preloadPublicImage, useCharacterStyle } from "../../living";
import { MenuCast, characterName, useCast } from "./MenuCast";
import { MenuPhone } from "./MenuPhone";
import { useIsPhone } from "../../mobile/phone";
import "../menu.css";

// ───────────── Barrido ─────────────
// El menú entra recortado por un borde inclinado que cruza la pantalla de derecha a izquierda,
// con una línea dorada encima; al cerrarlo, el borde vuelve a la derecha. Las posiciones son
// porcentajes del ancho: el borde va de (a, arriba) a (a − SLANT, abajo).
const SLANT = 16;
const HIDDEN = 124;
const SHOWN = -4;
const clip = (a: number) => `polygon(${a}% 0%, 140% 0%, 140% 100%, ${a - SLANT}% 100%)`;
const edge = (a: number) => `M${a} 0 L${a - SLANT} 100`;
const WIPE_IN = { duration: 0.5, ease: [0.76, 0, 0.18, 1] } as const;
const WIPE_OUT = { duration: 0.34, ease: [0.6, 0, 0.3, 1] } as const;

/** Rayas de velocidad que cruzan con el barrido (alto en %, largo en vw, retraso en s). */
const STREAKS: [number, number, number][] = [
  [14, 38, 0.02],
  [27, 22, 0.08],
  [41, 46, 0.0],
  [58, 30, 0.1],
  [69, 52, 0.05],
  [83, 26, 0.12],
];

/**
 * Menú de opciones: una pantalla al estilo del menú principal de un gacha, con el personaje del día, las
 * tarjetas de cada sección en perspectiva y los ajustes. Siempre montado: arma la música
 * (MusicControl ya no está en la cabecera), cierra el menú si cambia la sección y anima la
 * entrada y la salida.
 */
export function MenuScreen() {
  const open = useMenuUi((s) => s.open);
  const today = useCast().current;

  // La imagen del personaje de hoy, convertida y decodificada cuando la app está libre: abrir el
  // menú por primera vez no tiene que esperar a descargarla y decodificarla en mitad del barrido.
  useEffect(() => {
    if (!today?.builtin || !today.src) return;
    const src = today.src;
    const run = () => preloadPublicImage(src);
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(run, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(run, 1500);
    return () => clearTimeout(id);
  }, [today?.builtin, today?.src]);

  // Con la preferencia activada, la música arranca con la primera interacción (lo hacía la cabecera).
  useEffect(() => music.armAutoplay(), []);

  // Si algo cambia de sección por debajo (un enlace, la barra del teléfono), el menú se aparta.
  useEffect(
    () =>
      useGame.subscribe((s, prev) => {
        if (s.section !== prev.section && menuBusy()) useMenuUi.getState().setOpen(false);
      }),
    [],
  );

  // Teclado del menú. En captura: corre antes que el de las ventanas, y mientras haya una
  // abierta encima no hace nada (Escape la cierra a ella, no al menú).
  useEffect(() => {
    if (!open) return;
    const keys: Record<string, () => void> = {
      Escape: closeMenu,
      o: closeMenu,
      O: closeMenu,
      i: () => openOver(() => useGame.getState().setCollection("inventory")),
      c: () => openOver(() => openMerchant()),
      p: () => openOver(() => openCharacter()),
      j: () => openOver(() => openChronicle()),
      "/": searchFromMenu,
      l: () => toggleLang(),
      m: () => music.toggle(),
    };
    const onKey = (e: KeyboardEvent) => {
      if (windowOpen() || e.metaKey || e.ctrlKey || e.altKey) return;
      // Con el selector de personajes abierto, Escape lo cierra a él y el resto de teclas esperan.
      if (useMenuUi.getState().cast) {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          useMenuUi.getState().setCast(false);
        }
        return;
      }
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;
      const fn = keys[e.key];
      if (!fn || (typing && e.key !== "Escape")) return;
      e.preventDefault();
      e.stopPropagation();
      fn();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  return <AnimatePresence>{open && <Screen key="menu" />}</AnimatePresence>;
}

function Screen() {
  const root = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const still = calm();
  const cast = useCast();
  const hero = cast.current;
  const style = useCharacterStyle(hero?.id);
  // Con la entrada «gacha» el personaje no se desliza: se revela en su sitio (features/living).
  const slide = !still && style.entrance === "slide";
  const [wiped, setWiped] = useState(false);
  // La malla del personaje se monta cuando han terminado el barrido y su entrada (deslizarse, ~0,9 s;
  // la revelación «gacha», ~2 s): montarla a la vez bloqueaba el hilo principal y el barrido
  // saltaba a medio camino (features/living, `hold`).
  const [settled, setSettled] = useState(still);
  useEffect(() => {
    if (still) return;
    const id = setTimeout(() => setSettled(true), style.entrance === "gacha" ? 2100 : 950);
    return () => clearTimeout(id);
  }, [still, style.entrance]);
  // En el teléfono, otra distribución: el personaje a toda pantalla y botones alrededor (MenuPhone).
  const phone = useIsPhone();

  useEffect(() => {
    root.current?.focus({ preventScroll: true });
  }, []);

  // Paralaje: el ratón inclina las tarjetas y mueve al personaje y el fondo a distinta profundidad.
  useEffect(() => {
    const el = root.current;
    if (!el || still || !matchMedia("(pointer: fine)").matches) return;
    let raf = 0;
    let x = 0;
    let y = 0;
    const onMove = (e: PointerEvent) => {
      x = (e.clientX / window.innerWidth) * 2 - 1;
      y = (e.clientY / window.innerHeight) * 2 - 1;
      raf ||= requestAnimationFrame(() => {
        raf = 0;
        el.style.setProperty("--mx", x.toFixed(3));
        el.style.setProperty("--my", y.toFixed(3));
      });
    };
    el.addEventListener("pointermove", onMove);
    return () => {
      el.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [still]);

  return (
    <>
      <motion.div
        ref={root}
        className="mn"
        role="dialog"
        aria-modal="true"
        aria-label={t("menu.label")}
        tabIndex={-1}
        initial={still ? { opacity: 0 } : { clipPath: clip(HIDDEN) }}
        // Terminado el barrido, fuera el recorte (`wiped`): WebKit (la app de macOS) puede quedarse
        // con un clip-path a medio animar sobre la capa del lienzo de WebGL del personaje y enseñar
        // solo una franja diagonal. La salida parte del recorte abierto, así que barre igual.
        animate={still ? { opacity: 1 } : wiped ? { clipPath: "none", transition: { duration: 0 } } : { clipPath: clip(SHOWN) }}
        exit={still ? { opacity: 0, transition: { duration: 0.15 } } : { clipPath: [clip(SHOWN), clip(HIDDEN)], transition: WIPE_OUT }}
        transition={still ? { duration: 0.2 } : WIPE_IN}
        onAnimationComplete={(done) => {
          if ((done as { clipPath?: unknown }).clipPath === clip(SHOWN)) setWiped(true);
        }}
      >
        <Backdrop />
        <div className="mn-shade" aria-hidden />
        <div className="mn-deco" aria-hidden>
          <span className="mn-lines" />
          <span className="mn-words">Quest Board</span>
          <span className="mn-sigil">
            <Sigil />
          </span>
          <span className="mn-dust">
            {Array.from({ length: 16 }, (_, i) => (
              <i key={i} style={{ left: `${(i * 37 + 11) % 100}%`, animationDelay: `${-i * 1.3}s`, animationDuration: `${10 + (i % 5) * 2.4}s` }} />
            ))}
          </span>
        </div>

        {/* El personaje de hoy: el paralaje en .mn-hero, la entrada (y el cambio) en .mn-hero-in y, dentro, el personaje vivo (features/living). */}
        <div className="mn-hero" aria-hidden>
          <AnimatePresence mode="popLayout">
            {hero && (
              <motion.div
                key={hero.id}
                className="mn-hero-in"
                initial={slide ? { opacity: 0, x: -80 } : { opacity: 0 }}
                animate={{ opacity: 1, x: 0 }}
                exit={still ? { opacity: 0 } : { opacity: 0, x: 60, transition: { duration: 0.25 } }}
                transition={{ delay: slide ? 0.12 : 0, duration: slide ? 0.75 : 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <LivingCharacter c={hero} style={style} entrance={0} delay={0.3} hold={!settled} className="mn-char" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {phone ? (
          <MenuPhone speaker={characterName(hero, t)} characterId={hero?.id} />
        ) : (
          <div className="mn-ui">
            <div className="mn-top">
              <MenuBack />
              <MenuSettings />
              <MenuCurrency />
            </div>
            <div className="mn-left">
              <MenuPlayer />
              <MenuVoice speaker={characterName(hero, t)} characterId={hero?.id} />
              <WeeklyNews />
            </div>
            <MenuTiles />
          </div>
        )}

        <MenuCast />

        {/* En el escritorio el aviso vive en el detalle de la quest, que el menú tapa. */}
        <div className="mn-toast">
          <Toast />
        </div>
      </motion.div>

      {!still && (
        <div className="mn-fx" aria-hidden>
          <svg className="mn-edge" viewBox="0 0 100 100" preserveAspectRatio="none">
            <motion.path
              className="mn-edge-glow"
              vectorEffect="non-scaling-stroke"
              initial={{ d: edge(HIDDEN) }}
              animate={{ d: edge(SHOWN) }}
              exit={{ d: edge(HIDDEN), transition: WIPE_OUT }}
              transition={WIPE_IN}
            />
            <motion.path
              className="mn-edge-line"
              vectorEffect="non-scaling-stroke"
              initial={{ d: edge(HIDDEN) }}
              animate={{ d: edge(SHOWN) }}
              exit={{ d: edge(HIDDEN), transition: WIPE_OUT }}
              transition={WIPE_IN}
            />
          </svg>
          {STREAKS.map(([top, len, delay], i) => (
            <motion.i
              key={i}
              className="mn-streak"
              style={{ top: `${top}%`, width: `${len}vw` }}
              initial={{ x: "105vw", opacity: 0 }}
              animate={{ x: "-70vw", opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.5, delay, ease: [0.5, 0, 0.6, 1] }}
            />
          ))}
        </div>
      )}
    </>
  );
}

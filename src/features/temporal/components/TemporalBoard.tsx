import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Trans, useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { useNow } from "../../../lib/time";
import { sfx } from "../../../lib/sfx";
import { seededRandom } from "../../../lib/id";
import { countAccept, matchesAccept, sortTemporals } from "../model";
import { temporalBusy, useTemporalUi, type Origin } from "../ui";
import { Poster, ROW } from "./Poster";
import { AcceptFilter } from "./AcceptFilter";
import { HorizonFilter, countHorizons, matchesHorizon, useHorizonUi } from "../../horizon";
import "../temporal.css";
import { merchantBusy } from "../../merchant/ui";
import { characterBusy } from "../../equipment/ui";
import { chronicleBusy } from "../../chronicle/ui";
import { useIsPhone } from "../../mobile";

type Dir = "left" | "right" | "up" | "down";

/** Cartel más cercano en una dirección, mirando dónde está cada uno en pantalla (la rejilla es irregular). */
function neighbour(grid: HTMLElement, fromId: string | undefined, dir: Dir): string | undefined {
  const els = [...grid.querySelectorAll<HTMLElement>("[data-tid]")];
  const cur = els.find((e) => e.dataset.tid === fromId);
  if (!cur) return els[0]?.dataset.tid;
  const c = (e: HTMLElement) => {
    const r = e.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  const a = c(cur);
  let best: { id?: string; score: number } = { score: Infinity };
  for (const e of els) {
    if (e === cur) continue;
    const b = c(e);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const main = dir === "left" ? -dx : dir === "right" ? dx : dir === "up" ? -dy : dy;
    const side = dir === "left" || dir === "right" ? Math.abs(dy) : Math.abs(dx);
    if (main <= 8) continue;
    const score = main + side * 2.2;
    if (score < best.score) best = { id: e.dataset.tid, score };
  }
  return best.id;
}

/** Origen del cartel en pantalla, para que la vista en grande «salga» de él. */
export function originOf(el: HTMLElement): Origin {
  const hang = el.querySelector<HTMLElement>(".tp-paper") ?? el;
  const r = hang.getBoundingClientRect();
  const rot = parseFloat(getComputedStyle(el).getPropertyValue("--rot")) || 0;
  return { x: r.left, y: r.top, width: r.width, height: r.height, rotation: rot };
}

/** Motas de polvo que flotan en la luz de la taberna (posiciones estables). */
const MOTES = (() => {
  const rnd = seededRandom("motes");
  return Array.from({ length: 16 }, () => ({
    left: rnd() * 100,
    top: 20 + rnd() * 80,
    size: 2 + rnd() * 3,
    delay: -rnd() * 14,
    dur: 10 + rnd() * 9,
    drift: (rnd() - 0.5) * 80,
  }));
})();

/** Tablón de madera de los encargos temporales, aparte del tablón de quests. */
export function TemporalBoard() {
  const temporals = useGame((s) => s.state.temporals);
  const ready = useGame((s) => s.ready);
  const now = useNow(30_000);
  const { t } = useTranslation();
  const phone = useIsPhone();
  const selectedId = useTemporalUi((s) => s.selectedId);
  const showDone = useTemporalUi((s) => s.showDone);
  const farewell = useTemporalUi((s) => s.farewell);
  const clearing = useTemporalUi((s) => s.cleared?.temporalId);
  const horizon = useHorizonUi((s) => s.filter.temporal);
  const accept = useTemporalUi((s) => s.accept);
  const grid = useRef<HTMLDivElement>(null);

  const all = useMemo(() => sortTemporals(temporals.values()), [temporals]);
  const doneCount = all.filter((x) => x.status === "done").length;
  const pending = all.length - doneCount;
  // Plazos (features/horizon) y aceptación: se cuentan y se filtran los pendientes; cada
  // filtro cuenta lo que deja el otro. Los cumplidos solo salen en «Todo» (y están aceptados).
  const open = useMemo(() => all.filter((x) => x.status === "pending"), [all]);
  const counts = useMemo(() => countHorizons(open.filter((x) => matchesAccept(accept, x)), (x) => x, now), [open, accept, now]);
  const acceptCounts = useMemo(() => countAccept(open.filter((x) => matchesHorizon(horizon, x, now))), [open, horizon, now]);
  // El recién cumplido sigue colgado durante su animación y un momento después,
  // para recibir el sello «CLEAR» antes de descolgarse.
  const visible = all.filter(
    (x) =>
      (x.status === "pending" && matchesHorizon(horizon, x, now) && matchesAccept(accept, x)) ||
      (x.status === "done" && showDone && horizon === "all" && accept !== "planned") ||
      farewell?.id === x.id ||
      clearing === x.id,
  );
  const selected = visible.find((x) => x.id === selectedId) ?? visible[0];

  useEffect(() => {
    if (selected && selected.id !== selectedId) useTemporalUi.getState().select(selected.id);
  }, [selected, selectedId]);

  useEffect(() => {
    if (!farewell) return;
    const timer = setTimeout(() => useTemporalUi.getState().bid(undefined), 1300);
    return () => clearTimeout(timer);
  }, [farewell]);

  const openPoster = (id: string, el?: HTMLElement | null) => {
    sfx.unfold();
    useTemporalUi.getState().open(id, el ? originOf(el) : undefined);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const g = useGame.getState();
      // Con otra ventana abierta (mercader, personaje, crónica), el tablón espera.
      if (g.creating || g.clear || g.collection || temporalBusy() || merchantBusy() || characterBusy() || chronicleBusy() || e.metaKey || e.ctrlKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const ui = useTemporalUi.getState();
      const move = (dir: Dir) => {
        const id = grid.current && neighbour(grid.current, selected?.id, dir);
        if (id && id !== selected?.id) {
          sfx.move();
          ui.select(id);
          grid.current?.querySelector(`[data-tid="${id}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
      };
      switch (e.key) {
        case "ArrowRight": move("right"); break;
        case "ArrowLeft": move("left"); break;
        case "ArrowDown": move("down"); break;
        case "ArrowUp": move("up"); break;
        case "Enter": case "a":
          if (selected) openPoster(selected.id, grid.current?.querySelector<HTMLElement>(`[data-tid="${selected.id}"]`));
          break;
        case "n": sfx.move(); ui.setForm({ mode: "create" }); break;
        default: return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <motion.section
      className="tb"
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
    >
      <div className="tb-wood" />
      <div className="tb-light" />
      <div className="tb-motes" aria-hidden>
        {MOTES.map((m, i) => (
          <span
            key={i}
            style={
              {
                left: `${m.left}%`,
                top: `${m.top}%`,
                width: m.size,
                height: m.size,
                animationDelay: `${m.delay}s`,
                animationDuration: `${m.dur}s`,
                "--drift": `${m.drift}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <Corners />

      <header className="tb-head">
        <span className="tb-count">{t("temporal.board.pinned", { count: pending })}</span>
        <h2 className="tb-title">{t("temporal.board.title")}</h2>
        <div className="tb-tools">
          {doneCount > 0 && (
            <button
              className={`tb-tool ${showDone ? "on" : ""}`}
              onClick={() => {
                sfx.move();
                useTemporalUi.getState().setShowDone(!showDone);
                // Los cumplidos no tienen plazo y están aceptados: para verlos, el plazo vuelve a «Todo» y no se quedan fuera por «Sin aceptar».
                if (!showDone) {
                  useHorizonUi.getState().setFilter("temporal", "all");
                  if (accept === "planned") useTemporalUi.getState().setAccept("all");
                }
              }}
            >
              {showDone ? t("temporal.board.hideDone") : t("temporal.board.showDone", { n: doneCount })}
            </button>
          )}
        </div>
      </header>

      <div className="tb-filters">
        <AcceptFilter counts={acceptCounts} />
        <HorizonFilter section="temporal" counts={counts} />
      </div>

      <BoardToast />

      <div className="tb-scroll">
        <div className="tb-grid" ref={grid} style={{ gridAutoRows: ROW }}>
          <LayoutGroup>
            <AnimatePresence mode="popLayout">
              {ready &&
                visible.map((x, i) => (
                  <Poster
                    key={x.id}
                    t={x}
                    now={now}
                    index={i}
                    selected={x.id === selected?.id}
                    onSelect={() => {
                      if (x.id !== selected?.id) sfx.move();
                      useTemporalUi.getState().select(x.id);
                    }}
                    onOpen={(el) => openPoster(x.id, el)}
                  />
                ))}
            </AnimatePresence>
          </LayoutGroup>
        </div>
        {ready && visible.length === 0 && (
          <motion.div
            className="tb-empty"
            initial={{ opacity: 0, y: -20, rotate: -4 }}
            animate={{ opacity: 1, y: 0, rotate: -1.5 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.45 }}
          >
            <span className="tp-tack" />
            {pending > 0 && horizon !== "all" ? (
              <p>{t("horizon.empty")}</p>
            ) : pending > 0 && accept !== "all" ? (
              <p>{t("temporal.board.emptyFilter")}</p>
            ) : (
              <>
                <p>{t("temporal.board.empty")}</p>
                <p className="tb-empty-hint">
                  {phone ? t("mobile.touch.pin") : <Trans i18nKey="temporal.board.emptyHint" components={{ kbd: <kbd /> }} />}
                </p>
              </>
            )}
          </motion.div>
        )}
      </div>
    </motion.section>
  );
}

/** Los avisos (`say`) se pintan en el detalle de quest; en este tablón, abajo, sobre la madera. */
function BoardToast() {
  const toast = useGame((s) => s.toast);
  useTranslation(); // vuelve a pintar el aviso al cambiar de idioma
  return (
    <AnimatePresence mode="wait">
      {toast && (
        <motion.span
          key={toast.key}
          className="tb-toast"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {toast.text()}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/** Volutas de cobre en las esquinas del marco, como en el tablón de la referencia. */
function Corners() {
  const swirl = (
    <svg viewBox="0 0 120 120" aria-hidden>
      <path
        d="M8 112C8 60 22 30 52 16c22-10 46-6 58 6M18 112c2-34 14-58 36-70M8 112c10-6 22-6 30 2 8 8 4 22-8 22-9 0-13-10-7-15M110 8c-6 10-6 22 2 30 8 8 22 4 22-8 0-9-10-13-15-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path d="M38 30c6-8 16-10 22-4 5 6 1 15-6 15-6 0-8-7-4-10" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
  return (
    <>
      <span className="tb-corner tl">{swirl}</span>
      <span className="tb-corner tr">{swirl}</span>
      <span className="tb-corner bl">{swirl}</span>
      <span className="tb-corner br">{swirl}</span>
    </>
  );
}

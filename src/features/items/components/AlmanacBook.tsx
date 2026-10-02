import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { useTranslation } from "react-i18next";
import { sfx } from "../../../lib/sfx";
import { seededRandom } from "../../../lib/id";
import { num } from "../../../i18n";
import { RARITIES, RARITY_META, type ItemDef, type Rarity } from "../model";
import { ItemTile } from "./ItemTile";

/** Cromos por página: 4 columnas × 3 filas. */
const PER_PAGE = 12;

/**
 * Pasar página: la hoja gira sobre el lomo (borde derecho de la página izquierda).
 * Hacia delante, la nueva llega desde la página derecha; hacia atrás, la actual se va a ella.
 */
const leaf: Variants = {
  enter: (dir: number) => (dir > 0 ? { rotateY: -180, opacity: 1, zIndex: 2 } : { rotateY: 0, opacity: 0.4, zIndex: 0 }),
  center: { rotateY: 0, opacity: 1, zIndex: 1, transition: { duration: 0.65, ease: [0.45, 0.05, 0.3, 1] } },
  exit: (dir: number) =>
    dir > 0
      ? { opacity: 0, zIndex: 0, transition: { delay: 0.5, duration: 0.15 } }
      : { rotateY: -180, zIndex: 2, transition: { duration: 0.65, ease: [0.45, 0.05, 0.3, 1] } },
};

/** Inclinación estable de cada cromo pegado, como en un álbum de verdad. */
const tiltOf = (id: string) => (seededRandom(id)() - 0.5) * 5;

interface Props {
  /** Todos los objetos, ya ordenados. */
  all: ItemDef[];
  filter: Rarity | "all";
  setFilter(f: Rarity | "all"): void;
  inventory: Record<string, number>;
  selectedId?: string;
  onSelect(id: string): void;
  /** Contenido de la página derecha (ficha o formulario). Sin él, la portadilla con el progreso. */
  side?: ReactNode;
}

/** El almanaque como un libro abierto: cromos a la izquierda, ficha a la derecha e índice por rareza. */
export function AlmanacBook({ all, filter, setFilter, inventory, selectedId, onSelect, side }: Props) {
  const { t } = useTranslation();
  const list = filter === "all" ? all : all.filter((i) => i.rarity === filter);
  const numberOf = new Map(all.map((i, n) => [i.id, n + 1]));
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const [{ page, dir }, setPage] = useState({ page: 0, dir: 1 });
  const cur = Math.min(page, pages - 1);
  const shown = list.slice(cur * PER_PAGE, (cur + 1) * PER_PAGE);
  const owned = (i: ItemDef) => (inventory[i.id] ?? 0) > 0;

  const turn = (d: number) => {
    const next = Math.max(0, Math.min(pages - 1, cur + d));
    if (next === cur) return;
    sfx.page();
    setPage({ page: next, dir: d });
  };

  // Al cambiar de rareza se vuelve a la primera página.
  useEffect(() => setPage({ page: 0, dir: 1 }), [filter]);

  // Si se elige un objeto de otra página (p. ej. uno recién creado), el libro se abre por ella.
  useEffect(() => {
    const idx = list.findIndex((i) => i.id === selectedId);
    if (idx < 0) return;
    const target = Math.floor(idx / PER_PAGE);
    if (target !== cur) setPage({ page: target, dir: target > cur ? 1 : -1 });
  }, [selectedId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === "ArrowRight") turn(1);
      else if (e.key === "ArrowLeft") turn(-1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const ribbon = filter === "all" ? "var(--gold)" : RARITY_META[filter].color;

  return (
    <div className="book-wrap">
      <div className="book">
        <div className="book-pages">
          <section className="book-page is-left">
            <div className="book-leaves">
              <AnimatePresence initial={false} custom={dir}>
                <motion.div
                  key={`${filter}-${cur}`}
                  className="book-leaf"
                  custom={dir}
                  variants={leaf}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  <h3 className="sec-h book-head">
                    <span className="gem" style={{ color: ribbon }} />
                    <span className="tag" style={{ color: ribbon }}>
                      {filter === "all" ? "Almanac" : RARITY_META[filter].tag}
                    </span>
                    <span className="sec-sub">{filter === "all" ? t("items.book.subtitle") : t(`items.rarity.${filter}`)}</span>
                    <span className="sec-line" />
                  </h3>
                  <div className="book-grid">
                    {shown.map((i) => (
                      <div key={i.id} className="book-slot" style={{ "--tilt": `${tiltOf(i.id)}deg` } as React.CSSProperties}>
                        <ItemTile
                          item={i}
                          no={numberOf.get(i.id)}
                          locked={!owned(i)}
                          selected={i.id === selectedId}
                          onClick={() => onSelect(i.id)}
                        />
                      </div>
                    ))}
                    {/* Huecos vacíos hasta completar la página, como un álbum sin estrenar. */}
                    {list.length > 0 &&
                      Array.from({ length: PER_PAGE - shown.length }, (_, k) => (
                        <div key={`empty-${k}`} className="book-slot is-empty">
                          <span className="book-blank" />
                        </div>
                      ))}
                    {list.length === 0 && <p className="book-empty muted">{all.length ? t("items.emptyFilter") : t("items.emptyAlmanac")}</p>}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <footer className="book-foot">
              <button type="button" className="book-arrow" disabled={cur === 0} onClick={() => turn(-1)} title={t("items.book.prev")}>
                ‹
              </button>
              <span className="book-folio num">— {cur + 1} —</span>
              <span className="book-arrow-spacer" />
            </footer>
          </section>

          <section className="book-page is-right">
            <span className="book-ribbon" style={{ "--rc": ribbon } as React.CSSProperties} />
            <div className="book-page-body">{side ?? <BookIntro all={all} owned={owned} />}</div>
            <footer className="book-foot">
              <span className="book-arrow-spacer" />
              <span className="book-folio muted">{t("items.book.page", { page: cur + 1, pages })}</span>
              <button type="button" className="book-arrow" disabled={cur >= pages - 1} onClick={() => turn(1)} title={t("items.book.next")}>
                ›
              </button>
            </footer>
          </section>

          <span className="book-spine" aria-hidden />
        </div>
      </div>

      {/* Índice de pestañas en el canto del libro: una por rareza. */}
      <nav className="book-index">
        {(["all", ...[...RARITIES].reverse()] as const).map((r) => {
          const group = r === "all" ? all : all.filter((i) => i.rarity === r);
          const label = r === "all" ? t("items.all") : t(`items.rarity.${r}`);
          return (
            <button
              key={r}
              type="button"
              className={`book-tab ${filter === r ? "on" : ""}`}
              style={{ "--rc": r === "all" ? "var(--gold)" : RARITY_META[r].color } as React.CSSProperties}
              title={label}
              aria-label={label}
              onClick={() => {
                if (filter === r) return;
                sfx.page();
                setFilter(r);
              }}
            >
              <span className="gem" />
              <span className="num">
                {group.filter(owned).length}/{group.length}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/** Portadilla de la página derecha: progreso de la colección por rareza. */
function BookIntro({ all, owned }: { all: ItemDef[]; owned(i: ItemDef): boolean }) {
  const { t } = useTranslation();
  const got = all.filter(owned).length;
  const pct = all.length ? Math.round((got / all.length) * 100) : 0;
  return (
    <div className="book-intro">
      <span className="tag">Almanac</span>
      <h2 className="book-title">{t("items.book.title")}</h2>
      <p className="book-sub muted">{t("items.book.subtitle")}</p>
      <div className="book-orn" aria-hidden>
        <span />
        <i className="gem" />
        <span />
      </div>
      <p className="book-total">
        <b className="num">{num(got)}</b>
        <small className="num"> / {num(all.length)}</small>
      </p>
      <p className="book-pct">{t("items.book.progress", { pct })}</p>
      <ul className="book-stats">
        {[...RARITIES].reverse().map((r) => {
          const group = all.filter((i) => i.rarity === r);
          const n = group.filter(owned).length;
          return (
            <li key={r} style={{ "--rc": RARITY_META[r].color } as React.CSSProperties}>
              <span className="book-stat-name">{t(`items.rarity.${r}`)}</span>
              <span className="book-stat-bar">
                <i style={{ width: group.length ? `${(n / group.length) * 100}%` : 0 }} />
              </span>
              <span className="num">
                {n}/{group.length}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="book-pick muted">{t("items.book.pick")}</p>
    </div>
  );
}

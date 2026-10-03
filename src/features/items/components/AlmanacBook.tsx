import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { useTranslation } from "react-i18next";
import { sfx } from "../../../lib/sfx";
import { seededRandom } from "../../../lib/id";
import { num } from "../../../i18n";
import { RARITY_META, type ItemDef } from "../model";
import {
  ALMANACS,
  almanacEntries,
  almanacProgress,
  almanacVisible,
  entryOwned,
  type Almanac,
  type AlmanacEntry,
} from "../almanac";
import type { GearDef, Purchase } from "../../merchant/model";
import { SlotGlyph } from "../../merchant/components/SlotGlyph";
import { ItemTile } from "./ItemTile";
import { GearTile } from "./GearTile";
import { useSwipe } from "../../mobile";

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

/** Presentación de cada almanaque: el color de su cinta y su pestaña, y la etiqueta decorativa (en inglés). */
const ALMANAC_META: Record<Almanac, { color: string; tag: string }> = {
  chest: { color: "var(--r-legendary)", tag: "Collection" },
  quest: { color: "var(--gold)", tag: "Quest Items" },
  armor: { color: "var(--merchant)", tag: "Armory" },
  backdrop: { color: "var(--repeat)", tag: "Backdrops" },
  emblem: { color: "var(--elite)", tag: "Emblems" },
};

/** Icono de la pestaña de cada almanaque. */
function AlmanacGlyph({ a }: { a: Almanac }) {
  if (a === "chest") return <span aria-hidden>❖</span>;
  if (a === "quest") return <span aria-hidden>✦</span>;
  return <SlotGlyph slot={a === "armor" ? "body" : a} className="book-tab-svg" />;
}

interface Props {
  items: Map<string, ItemDef>;
  gear: Map<string, GearDef>;
  inventory: Record<string, number>;
  /** Equipo comprado a Hu Tao (features/merchant). */
  owned: Record<string, Purchase>;
  /** Clave del cromo elegido (`itemKey` o `gearKey`). */
  selectedKey?: string;
  onSelect(key: string): void;
  /** Contenido de la página derecha (ficha o formulario). Sin él, la portadilla con el progreso. */
  side?: ReactNode;
}

/**
 * El almanaque como un libro abierto: cromos a la izquierda, ficha a la derecha y, en
 * el canto, un índice con un almanaque por tipo de objeto (coleccionables, objetos de
 * quest, armaduras, fondos y emblemas). Solo sirve para ver lo que llevas.
 */
export function AlmanacBook({ items, gear, inventory, owned, selectedKey, onSelect, side }: Props) {
  const { t } = useTranslation();
  const [almanac, setAlmanac] = useState<Almanac>("chest");
  const books = useMemo(
    () => Object.fromEntries(ALMANACS.map((a) => [a, almanacEntries(a, items.values(), gear.values())])) as Record<Almanac, AlmanacEntry[]>,
    [items, gear],
  );
  const list = books[almanac];
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const [{ page, dir }, setPage] = useState({ page: 0, dir: 1 });
  const cur = Math.min(page, pages - 1);
  const shown = list.slice(cur * PER_PAGE, (cur + 1) * PER_PAGE);
  const isOwned = (e: AlmanacEntry) => entryOwned(e, { inventory, owned });
  const meta = ALMANAC_META[almanac];

  const turn = (d: number) => {
    const next = Math.max(0, Math.min(pages - 1, cur + d));
    if (next === cur) return;
    sfx.page();
    setPage({ page: next, dir: d });
  };
  const swipe = useSwipe(turn);

  /** Abre otro almanaque por su primera página. */
  const open = (a: Almanac) => {
    setAlmanac(a);
    setPage({ page: 0, dir: 1 });
  };

  // Si se elige un cromo de otro almanaque u otra página (p. ej. un objeto recién creado), el libro se abre por él.
  useEffect(() => {
    if (!selectedKey) return;
    const home = ALMANACS.find((a) => books[a].some((e) => e.key === selectedKey));
    if (!home) return;
    const target = Math.floor(books[home].findIndex((e) => e.key === selectedKey) / PER_PAGE);
    if (home !== almanac) {
      setAlmanac(home);
      setPage({ page: target, dir: 1 });
    } else if (target !== cur) setPage({ page: target, dir: target > cur ? 1 : -1 });
  }, [selectedKey]);

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

  return (
    <div className="book-wrap">
      <div className="book">
        <div className="book-pages m-swipe" {...swipe}>
          <section className="book-page is-left">
            <div className="book-leaves">
              <AnimatePresence initial={false} custom={dir}>
                <motion.div
                  key={`${almanac}-${cur}`}
                  className="book-leaf"
                  custom={dir}
                  variants={leaf}
                  initial="enter"
                  animate="center"
                  exit="exit"
                >
                  <h3 className="sec-h book-head">
                    <span className="gem" style={{ color: meta.color }} />
                    <span className="tag" style={{ color: meta.color }}>
                      {meta.tag}
                    </span>
                    <span className="sec-sub">{t(`items.almanacs.${almanac}`)}</span>
                    <span className="sec-line" />
                  </h3>
                  <div className="book-grid">
                    {shown.map((e) => {
                      const no = list.indexOf(e) + 1;
                      const locked = !isOwned(e);
                      return (
                        <div key={e.key} className="book-slot" style={{ "--tilt": `${tiltOf(e.key)}deg` } as CSSProperties}>
                          {e.kind === "item" ? (
                            <ItemTile item={e.item} no={no} locked={locked} selected={e.key === selectedKey} onClick={() => onSelect(e.key)} />
                          ) : (
                            <GearTile gear={e.gear} no={no} locked={locked} selected={e.key === selectedKey} onClick={() => onSelect(e.key)} />
                          )}
                        </div>
                      );
                    })}
                    {/* Huecos vacíos hasta completar la página, como un álbum sin estrenar. */}
                    {list.length > 0 &&
                      Array.from({ length: PER_PAGE - shown.length }, (_, k) => (
                        <div key={`empty-${k}`} className="book-slot is-empty">
                          <span className="book-blank" />
                        </div>
                      ))}
                    {list.length === 0 && (
                      <p className="book-empty muted">{almanac === "chest" && items.size === 0 ? t("items.emptyAlmanac") : t("items.emptySection")}</p>
                    )}
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
            <span className="book-ribbon" style={{ "--rc": meta.color } as CSSProperties} />
            <div className="book-page-body">{side ?? <BookIntro almanac={almanac} entries={list} owned={isOwned} />}</div>
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

      {/* Índice en el canto del libro: un almanaque por tipo de objeto. */}
      <nav className="book-index">
        {ALMANACS.filter((a) => almanacVisible(a, books[a].length)).map((a) => {
          const label = t(`items.almanacs.${a}`);
          return (
            <button
              key={a}
              type="button"
              className={`book-tab is-${a} ${almanac === a ? "on" : ""}`}
              style={{ "--rc": ALMANAC_META[a].color } as CSSProperties}
              title={label}
              aria-label={label}
              onClick={() => {
                if (almanac === a) return;
                sfx.page();
                open(a);
              }}
            >
              <span className="book-tab-glyph">
                <AlmanacGlyph a={a} />
              </span>
              <span className="num">
                {books[a].filter(isOwned).length}/{books[a].length}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/** Portadilla de la página derecha: el progreso del almanaque abierto, en total y por rareza. */
function BookIntro({ almanac, entries, owned }: { almanac: Almanac; entries: AlmanacEntry[]; owned(e: AlmanacEntry): boolean }) {
  const { t } = useTranslation();
  const p = almanacProgress(entries, owned);
  const pct = p.total ? Math.round((p.got / p.total) * 100) : 0;
  return (
    <div className="book-intro">
      <span className="tag">{ALMANAC_META[almanac].tag}</span>
      <h2 className="book-title">{t(`items.almanacs.${almanac}`)}</h2>
      <p className="book-sub muted">{t(`items.almanacHint.${almanac}`)}</p>
      <div className="book-orn" aria-hidden>
        <span />
        <i className="gem" />
        <span />
      </div>
      <p className="book-total">
        <b className="num">{num(p.got)}</b>
        <small className="num"> / {num(p.total)}</small>
      </p>
      <p className="book-pct">{t("items.book.progress", { pct })}</p>
      <ul className="book-stats">
        {p.byRarity.map((r) => (
          <li key={r.rarity} style={{ "--rc": RARITY_META[r.rarity].color } as CSSProperties}>
            <span className="book-stat-name">{t(`items.rarity.${r.rarity}`)}</span>
            <span className="book-stat-bar">
              <i style={{ width: r.total ? `${(r.got / r.total) * 100}%` : 0 }} />
            </span>
            <span className="num">
              {r.got}/{r.total}
            </span>
          </li>
        ))}
      </ul>
      <p className="book-pick muted">{t("items.book.pick")}</p>
    </div>
  );
}

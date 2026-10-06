import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { sfx } from "../../../lib/sfx";
import { BACKDROP_EXIT, MODAL_EXIT } from "../../../lib/motion";
import { Skull } from "../../temporal/components/Skull";
import { search, type SearchHit } from "../model";
import { closeSearch, openHit, openSearch } from "../actions";
import { useSearchUi } from "../ui";
import "../search.css";

/** Ventana de búsqueda: escribir, ↑↓ para elegir y Enter para ir. */
export function SearchModal() {
  const open = useSearchUi((s) => s.open);
  return <AnimatePresence>{open && <Panel />}</AnimatePresence>;
}

function Panel() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(0);
  const quests = useGame((s) => s.state.quests);
  const temporals = useGame((s) => s.state.temporals);
  const agenda = useGame((s) => s.state.agenda);
  const items = useGame((s) => s.state.items);
  const ref = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const hits = useMemo(
    () => search({ quests: quests.values(), temporals: temporals.values(), agenda: agenda.values(), items: items.values() }, query),
    [query, quests, temporals, agenda, items],
  );

  useEffect(() => ref.current?.focus(), []);
  useEffect(() => setSel(0), [query]);
  useEffect(() => {
    list.current?.querySelector(".sr-hit.on")?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const go = (h?: SearchHit) => {
    if (!h) return;
    openHit(h);
  };

  return (
    <motion.div className="modal-bg sr-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={BACKDROP_EXIT} onMouseDown={(e) => e.target === e.currentTarget && closeSearch()}>
      <motion.div
        className="sr"
        role="dialog"
        aria-label={t("search.title")}
        initial={{ opacity: 0, y: -16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, transition: MODAL_EXIT }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
      >
        <div className="sr-line">
          <SearchIcon />
          <input
            ref={ref}
            className="sr-input"
            type="search"
            value={query}
            enterKeyHint="go"
            placeholder={t("search.placeholder")}
            aria-label={t("search.title")}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Escape") closeSearch();
              else if (e.key === "ArrowDown") {
                e.preventDefault();
                sfx.move();
                setSel((i) => Math.min(hits.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                sfx.move();
                setSel((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(hits[sel]);
              }
            }}
          />
          <button className="sr-close" aria-label={t("search.close")} onClick={closeSearch}>
            ✕
          </button>
        </div>
        <div className="sr-list" ref={list}>
          {query.trim() && hits.length === 0 && <p className="sr-empty muted">{t("search.none")}</p>}
          {!query.trim() && <p className="sr-empty muted">{t("search.hint")}</p>}
          {hits.map((h, i) => (
            <button key={`${h.kind}:${h.id}`} className={`sr-hit is-${h.kind} is-${h.status} ${i === sel ? "on" : ""}`} onMouseEnter={() => setSel(i)} onClick={() => go(h)}>
              <span className="sr-ico">{h.kind === "temporal" ? <Skull /> : h.kind === "agenda" ? "◷" : h.kind === "item" ? "✦" : <span className="gem" />}</span>
              <span className="sr-text">
                <span className="sr-title">{h.title}</span>
                {h.snippet && <span className="sr-snippet muted">{h.snippet}</span>}
              </span>
              <span className="sr-kind muted">
                {t(`search.kinds.${h.kind}`)}
                {h.status !== "open" && ` · ${t(`search.status.${h.status}`)}`}
              </span>
            </button>
          ))}
        </div>
        <p className="sr-foot muted">{t("search.keys")}</p>
      </motion.div>
    </motion.div>
  );
}

/** Lupa (cabecera, menú «Más» y la propia ventana). */
export function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden className="sr-icon">
      <circle cx="6.8" cy="6.8" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.3 10.3 14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Botón de la cabecera. */
export function SearchButton() {
  const { t } = useTranslation();
  return (
    <button className="mute sr-btn" title={`${t("search.title")} (/)`} aria-label={t("search.title")} onClick={openSearch}>
      <SearchIcon />
    </button>
  );
}

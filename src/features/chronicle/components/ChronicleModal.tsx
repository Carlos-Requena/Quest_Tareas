import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useGame } from "../../../store/game";
import { sfx } from "../../../lib/sfx";
import { seededRandom } from "../../../lib/id";
import { LANGS, currentLang, num } from "../../../i18n";
import { RARITY_META } from "../../items/model";
import { gearName } from "../../armory/labels";
import { attributeName } from "../../attributes/labels";
import { Flame } from "../../streaks/components/Flame";
import { DIARY_LINES, blockWeight, chronicleDays, chronicleTotals, paginate, textUnits, type ChronicleLine, type DiaryBlock } from "../model";
import { useChronicleUi } from "../ui";
import "@fontsource/im-fell-english/latin-400.css";
import "@fontsource/im-fell-english/latin-400-italic.css";
import "../chronicle.css";

/** Crónica del aventurero: un diario gastado con lo que has hecho, día a día. */
export function ChronicleModal() {
  const open = useChronicleUi((s) => s.open);
  return <AnimatePresence>{open && <Modal />}</AnimatePresence>;
}

const dateOf = (ts: number, opts: Intl.DateTimeFormatOptions) => new Date(ts).toLocaleDateString(LANGS[currentLang()].locale, opts);

function Modal() {
  const { t } = useTranslation();
  const chronicle = useGame((s) => s.state.chronicle);
  const player = useGame((s) => s.state.player);
  const gear = useGame((s) => s.state.gear);
  const setOpen = useChronicleUi((s) => s.setOpen);
  const close = () => setOpen(false);

  const days = useMemo(() => chronicleDays(chronicle), [chronicle]);
  // Renglones que caben en una página con el tamaño actual de la ventana.
  const spreadRef = useRef<HTMLDivElement>(null);
  const { lines, cpl } = useDiaryLines(spreadRef);
  const gearOf = (id: string) => gear.get(id);
  // Página 0: la portadilla. Las demás, el diario. Cada entrada pesa los renglones que
  // ocupa su texto ya escrito, en este idioma y con este ancho de página.
  const pages = useMemo(
    () =>
      paginate(days, lines, (b) => {
        if (b.kind !== "line") return blockWeight(b);
        const x = entryTexts(b.line, t, gearOf);
        const rows = (s: string) => Math.max(1, Math.ceil(textUnits(s) / cpl));
        return rows(`${x.text} ${x.streak ?? ""} ${x.reward ?? ""}`) + (x.found ? rows(x.found) : 0) + (x.level ? 1 : 0) + (x.attr ? rows(x.attr) : 0);
      }),
    [days, lines, cpl, t, gear],
  );
  const total = pages.length + 1;
  const spreads = Math.ceil(total / 2);
  // Un diario se abre por la última página escrita.
  const [{ spread, dir }, setSpread] = useState({ spread: spreads - 1, dir: 1 });
  const cur = Math.min(spread, spreads - 1);
  const totals = useMemo(() => chronicleTotals(chronicle, Date.now()), [chronicle]);

  const turn = (to: number) => {
    const next = Math.max(0, Math.min(spreads - 1, to));
    if (next === cur) return;
    sfx.page();
    setSpread({ spread: next, dir: next > cur ? 1 : -1 });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "j" || e.key === "J") close();
      else if (e.key === "ArrowRight") turn(cur + 1);
      else if (e.key === "ArrowLeft") turn(cur - 1);
      else if (e.key === "Home") turn(0);
      else if (e.key === "End") turn(spreads - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const pageAt = (i: number): ReactNode => {
    if (i === 0)
      return (
        <Cover
          rank={player.rank}
          level={player.level}
          startedAt={chronicle.startedAt}
          totals={totals}
          empty={chronicle.entries.length === 0}
        />
      );
    const blocks = pages[i - 1];
    if (!blocks) return <div className="diary-blank" />;
    return blocks.map((b, k) => <Block key={k} b={b} t={t} gearOf={gearOf} />);
  };

  const left = cur * 2;
  return (
    <motion.div
      className="modal-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <motion.div
        className="modal chron"
        style={{ "--cat": "var(--diary-paper-lo)" } as CSSProperties}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
      >
        <header className="modal-h">
          <span className="gem" />
          <span className="tag">Chronicle</span>
          <span className="sec-sub">{t("chronicle.title")}</span>
          <span className="chron-pages muted">{t("chronicle.pages", { a: left + 1, b: Math.min(total, left + 2), n: total })}</span>
          <button className="icon-btn chron-x" onClick={close} title={t("modal.close")}>
            ✕
          </button>
        </header>

        <div className="chron-body">
          <div className="diary">
            <span className="diary-ribbon" aria-hidden />
            <div className="diary-spread" ref={spreadRef}>
              <AnimatePresence initial={false} custom={dir} mode="popLayout">
                <motion.div
                  key={cur}
                  className="diary-pages"
                  custom={dir}
                  initial={{ opacity: 0, x: dir * 18, rotateY: dir * -6 }}
                  animate={{ opacity: 1, x: 0, rotateY: 0, transition: { duration: 0.42, ease: [0.3, 0.1, 0.2, 1] } }}
                  exit={{ opacity: 0, x: dir * -18, rotateY: dir * 6, transition: { duration: 0.22 } }}
                >
                  <Page n={left} side="left">
                    {pageAt(left)}
                  </Page>
                  <Page n={left + 1} side="right" last={left + 1 >= total - 1}>
                    {left + 1 < total ? pageAt(left + 1) : <div className="diary-blank" />}
                  </Page>
                </motion.div>
              </AnimatePresence>
              <span className="diary-spine" aria-hidden />
            </div>
            <button className="diary-arrow is-prev" disabled={cur === 0} onClick={() => turn(cur - 1)} aria-label="←">
              ‹
            </button>
            <button className="diary-arrow is-next" disabled={cur >= spreads - 1} onClick={() => turn(cur + 1)} aria-label="→">
              ›
            </button>
          </div>
        </div>

        <footer className="modal-f">
          <span className="muted hint">
            <kbd>←</kbd>
            <kbd>→</kbd> {t("chronicle.keys.turn")} · <kbd>Home</kbd>
            <kbd>End</kbd> {t("chronicle.keys.ends")} · <kbd>J</kbd>
            <kbd>Esc</kbd> {t("chronicle.keys.close")}
          </span>
        </footer>
      </motion.div>
    </motion.div>
  );
}

/** Renglón de las páginas (CSS: .diary-text line-height) y márgenes de arriba y abajo. */
const LINE_PX = 26;
const PAGE_PAD_PX = 26 + 34;

/** Ancho medio de medio carácter (una letra latina; un ideograma son dos), en px. */
const UNIT_PX = 7.2;
/** Márgenes de izquierda y derecha de la página. */
const PAGE_SIDES_PX = 52 + 30 + 14;

/**
 * Cuántos renglones caben en una página y cuántos medios caracteres en un renglón:
 * se mide el libro y se vuelve a medir al cambiar la ventana.
 */
function useDiaryLines(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState({ lines: DIARY_LINES, cpl: 50 });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () =>
      setSize({
        lines: Math.max(8, Math.floor((el.clientHeight - PAGE_PAD_PX) / LINE_PX) - 1),
        cpl: Math.max(20, Math.floor((el.clientWidth / 2 - PAGE_SIDES_PX) / UNIT_PX)),
      });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/**
 * Una página de papel viejo. El desgaste (manchas, borde comido, una oreja doblada)
 * sale de una semilla por número de página: siempre igual para la misma página.
 */
function Page({ n, side, last, children }: { n: number; side: "left" | "right"; last?: boolean; children: ReactNode }) {
  const wear = useMemo(() => wearOf(n), [n]);
  return (
    <section className={`diary-page is-${side} ${wear.dogEar && side === "right" ? "has-ear" : ""}`} style={wear.style}>
      {wear.ring && (
        <svg className="diary-ring" viewBox="0 0 100 100" style={wear.ringStyle} aria-hidden>
          <circle cx="50" cy="50" r="40" />
          <circle cx="50" cy="50" r="36" />
        </svg>
      )}
      <div className="diary-text">{children}</div>
      {n > 0 && <span className="diary-folio">{n}</span>}
      {last && side === "right" && <span className="diary-end" aria-hidden />}
    </section>
  );
}

function wearOf(n: number) {
  const r = seededRandom(`diary-page-${n}`);
  const pct = (a: number, b: number) => `${(a + r() * (b - a)).toFixed(1)}%`;
  // Borde algo comido: un polígono con pequeñas mordidas en el canto exterior.
  const bites: string[] = [];
  for (let i = 0; i <= 20; i++) bites.push(`calc(100% - ${(r() * 3).toFixed(1)}px) ${(i * 5).toFixed(0)}%`);
  const style = {
    "--stain-x": pct(10, 90),
    "--stain-y": pct(10, 90),
    "--stain-s": `${(90 + r() * 120).toFixed(0)}px`,
    "--fox-x": pct(5, 95),
    "--fox-y": pct(5, 95),
    "--edge": `polygon(0 0, ${bites.join(", ")}, 0 100%)`,
    "--tilt": `${((r() - 0.5) * 0.5).toFixed(2)}deg`,
  } as CSSProperties;
  const ring = r() < 0.32;
  const ringStyle = { left: pct(30, 75), top: pct(45, 80), transform: `rotate(${Math.round(r() * 360)}deg)` } as CSSProperties;
  return { style, ring, ringStyle, dogEar: r() < 0.4 };
}

interface CoverProps {
  rank: string;
  level: number;
  startedAt?: number;
  totals: ReturnType<typeof chronicleTotals>;
  empty: boolean;
}

/** Portadilla: el título, quién escribe y el resumen de la aventura. */
function Cover({ rank, level, startedAt, totals, empty }: CoverProps) {
  const { t } = useTranslation();
  return (
    <div className="diary-cover">
      <span className="diary-cover-orn" aria-hidden>
        ❦
      </span>
      <h2 className="diary-title">{t("chronicle.title")}</h2>
      <p className="diary-sub">{t("chronicle.subtitle", { rank, level })}</p>
      {startedAt !== undefined && <p className="diary-started">{t("chronicle.started", { date: dateOf(startedAt, { dateStyle: "long" }) })}</p>}
      {empty ? (
        <div className="diary-empty">
          <p>{t("chronicle.empty")}</p>
          <p className="diary-soft">{t("chronicle.emptyHint")}</p>
        </div>
      ) : (
        <ul className="diary-stats">
          <li>
            {t("chronicle.stats.days", { count: totals.days })} <span className="diary-soft">({t("chronicle.stats.active", { count: totals.activeDays })})</span>
          </li>
          <li>{t("chronicle.stats.quests", { count: totals.quests })}</li>
          <li>{t("chronicle.stats.temporals", { count: totals.temporals })}</li>
          <li>{t("chronicle.stats.purchases", { count: totals.purchases })}</li>
          {totals.bestStreak > 1 && (
            <li>
              <Flame tier={2} /> {t("chronicle.stats.streak", { n: totals.bestStreak })}
            </li>
          )}
        </ul>
      )}
      <span className="diary-cover-orn is-bottom" aria-hidden>
        ⁂
      </span>
    </div>
  );
}

/** Frase de una entrada: una de la lista, elegida con su `ts` (siempre la misma). */
function phrase(t: TFunction, kind: "quest" | "elite" | "temporal" | "purchase", ts: number, vars: Record<string, string>): string {
  const all = t(`chronicle.lines.${kind}`, { returnObjects: true, ...vars }) as unknown as string[];
  if (!Array.isArray(all) || !all.length) return "";
  return all[Math.floor(seededRandom(`${kind}-${ts}`)() * all.length)];
}

function Block({ b, t, gearOf }: { b: DiaryBlock; t: TFunction; gearOf: GearLookup }) {
  if (b.kind === "day") {
    return (
      <h4 className="diary-day">
        <span className="diary-day-n">{t("chronicle.day", { n: b.day.n })}</span>
        <span className="diary-day-date">
          {dateOf(b.day.day, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          {b.cont && ` ${t("chronicle.cont")}`}
        </span>
      </h4>
    );
  }
  if (b.kind === "total") {
    return <p className="diary-total">{t("chronicle.total", { xp: num(b.day.xp), gold: num(b.day.gold) })}</p>;
  }
  return <Entry line={b.line} t={t} gearOf={gearOf} />;
}

type GearLookup = (id: string) => { id: string; name: string } | undefined;

/** Lo que se escribe de una entrada: la frase, la recompensa y las líneas de debajo. */
function entryTexts(line: ChronicleLine, t: TFunction, gearOf: GearLookup) {
  const e = line.entry;
  let text: string;
  let reward: string | undefined;
  let streak: string | undefined;
  let found: string | undefined;
  let mark: ReactNode = "·";
  if (e.k === "quest") {
    text = phrase(t, e.category === "elite" ? "elite" : "quest", e.ts, { title: e.title });
    reward = t("chronicle.reward", { xp: num(e.xp), gold: num(e.gold) });
    if (e.streak && e.streak > 1) streak = t("chronicle.streak", { n: e.streak });
    if (e.found?.length) found = `${t("chronicle.found")} ${e.found.map((f) => f.name).join(", ")}`;
    mark = e.category === "elite" ? "✠" : e.category === "repeat" ? "↻" : "✎";
  } else if (e.k === "temporal") {
    text = phrase(t, "temporal", e.ts, { title: e.title });
    reward = t("chronicle.reward", { xp: num(e.xp), gold: num(e.gold) });
    mark = "☠".repeat(Math.max(1, Math.min(5, e.skulls)));
  } else {
    // Las piezas de serie se nombran en el idioma de la interfaz.
    const name = gearName(gearOf(e.gearId) ?? { id: e.gearId, name: e.name }, t);
    text = phrase(t, "purchase", e.ts, { name, price: num(e.price) });
    mark = "◈";
  }
  const level = line.levelUp ? t("chronicle.levelUp", { n: line.levelUp }) : undefined;
  const attr = line.attrUp
    ? t("chronicle.attrUp", { area: attributeName({ key: line.attrUp.key, name: line.attrUp.name }, t), n: line.attrUp.level })
    : undefined;
  return { text, reward, streak, found, mark, level, attr };
}

function Entry({ line, t, gearOf }: { line: ChronicleLine; t: TFunction; gearOf: GearLookup }) {
  const e = line.entry;
  const x = entryTexts(line, t, gearOf);
  return (
    <div className={`diary-entry is-${e.k}`}>
      <span className="diary-mark" aria-hidden>
        {x.mark}
      </span>
      <p className="diary-line">
        {x.text}
        {x.streak && <span className="diary-soft"> {x.streak}</span>}
        {x.reward && <span className="diary-reward">{x.reward}</span>}
      </p>
      {e.k === "quest" && e.found?.length ? (
        <p className="diary-sub-line">
          {t("chronicle.found")}{" "}
          {e.found.map((f, i) => (
            <span key={f.id} className="diary-find" style={{ "--rc": RARITY_META[f.rarity].color } as CSSProperties}>
              {i > 0 && ", "}
              {f.name}
            </span>
          ))}
        </p>
      ) : null}
      {x.level && <p className="diary-sub-line diary-red">{x.level}</p>}
      {x.attr && <p className="diary-sub-line diary-soft">{x.attr}</p>}
    </div>
  );
}

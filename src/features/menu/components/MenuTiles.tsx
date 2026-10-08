import { useMemo, type ReactNode } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { useNow } from "../../../lib/time";
import { calm } from "../../../lib/fx";
import { num } from "../../../i18n";
import { Emblem } from "../../../components/Header";
import { BagIcon } from "../../items";
import { LanternIcon, nextWeekStart, openMerchant } from "../../merchant";
import { HelmetIcon, openCharacter } from "../../equipment";
import { DiaryIcon, openChronicle } from "../../chronicle";
import { Skull, needsAttention } from "../../temporal";
import { CalendarIcon } from "../../calendar";
import { SearchIcon } from "../../search";
import { openCustomize } from "../../customize/ui";
import { BrushIcon } from "../../customize/components/CustomizeIcons";
import { goTo, openOver, searchFromMenu } from "../actions";
import { activeQuests, daysUntil } from "../model";
import { AlmanacIcon, ClockIcon } from "./MenuIcons";

const HUTAO = `${import.meta.env.BASE_URL}merchant/hutao.webp`;

/**
 * Celda de la rejilla en perspectiva: entra desde la derecha girando hacia el sitio, una tras
 * otra, detrás del barrido. Con «reducir movimiento», solo aparece.
 *
 * La opacidad se resuelve en una décima de segundo, al principio del giro: mientras es menor
 * que 1, el navegador aplana el 3D de la celda y el logo y el rótulo se pintan pegados al
 * fondo (más pequeños). Si durase todo el muelle, al llegar a 1 saltarían hacia delante
 * (`translateZ`) y se verían crecer de golpe.
 */
function Cell({ name, i, children }: { name: string; i: number; children: ReactNode }) {
  const still = calm();
  const delay = 0.14 + i * 0.05;
  return (
    <motion.div
      className={`mn-cell is-${name}`}
      initial={still ? { opacity: 0 } : { opacity: 0, x: 110, rotateY: -32 }}
      animate={still ? { opacity: 1 } : { opacity: 1, x: 0, rotateY: 0 }}
      transition={still ? { duration: 0.2 } : { type: "spring", stiffness: 230, damping: 24, delay, opacity: { duration: 0.1, delay } }}
    >
      {children}
    </motion.div>
  );
}

interface TileProps {
  name: string;
  /** Rótulo grande, decorativo y en inglés (como ELITE o QUEST CLEAR). */
  title: string;
  /** Nombre traducido, debajo del rótulo. */
  sub: string;
  icon: ReactNode;
  /** Tecla que abre lo mismo desde el tablón. */
  k?: string;
  onClick(): void;
  /** Lo que va encima de la tarjeta: aviso o etiqueta. */
  extra?: ReactNode;
  /** Lo que va en el fondo de la tarjeta, recortado con él. */
  art?: ReactNode;
}

/**
 * Tarjeta de una sección: el fondo con su logo en grande (marca de agua) y, flotando delante
 * en 3D, el logo en su rombo, el rótulo con relieve y el nombre. Al pasar el ratón se acerca.
 */
function Tile({ name, title, sub, icon, k, onClick, extra, art }: TileProps) {
  return (
    <button className={`mn-tile is-${name}`} onClick={onClick} title={k ? `${sub} (${k})` : sub} aria-label={sub}>
      <span className="mn-tile-bg" aria-hidden>
        {art}
        <span className="mn-tile-mark">{icon}</span>
      </span>
      <span className="mn-logo" aria-hidden>
        {icon}
      </span>
      <span className="mn-tile-txt" aria-hidden>
        <b className="mn-title">{title}</b>
        <span className="mn-sub">{sub}</span>
      </span>
      {extra}
      {k && <kbd className="mn-key">{k}</kbd>}
    </button>
  );
}

/** Las tarjetas del menú, en una rejilla inclinada como el menú principal de un gacha. */
export function MenuTiles() {
  const { t } = useTranslation();
  const quests = useGame((s) => s.state.quests);
  const temporals = useGame((s) => s.state.temporals);
  const units = useGame((s) => Object.values(s.state.player.inventory).reduce((a, b) => a + b, 0));
  const now = useNow(60_000);
  const active = useMemo(() => activeQuests(quests.values()), [quests]);
  const urgent = useMemo(() => needsAttention(temporals.values(), now), [temporals, now]);
  const days = daysUntil(nextWeekStart(now), now);
  const cur = active[0];
  const setCollection = useGame((s) => s.setCollection);

  return (
    <nav className="mn-tiles" aria-label={t("menu.label")}>
      <div className="mn-tilt">
        {/* La tarjeta grande: volver al tablón, con las quests en curso. */}
        <Cell name="board" i={0}>
          <button className="mn-tile is-board" onClick={() => goTo("board")} aria-label={t("menu.tiles.board")} title={t("menu.tiles.board")}>
            <span className="mn-tile-bg" aria-hidden>
              <span className="mn-tile-mark">
                <Emblem size={64} />
              </span>
            </span>
            <span className="mn-hero-box" aria-hidden>
              <span className="mn-hero-plus">
                <Emblem size={30} />
              </span>
              <b className="num mn-hero-n">{active.length}</b>
              <span className="mn-hero-lbl">{t("menu.hero.active")}</span>
            </span>
            <span className="mn-tile-txt" aria-hidden>
              <b className="mn-title">Quests</b>
              <span className="mn-hero-cur">
                <span className="mn-chip">{t("menu.hero.current")}</span>
                <span className="mn-hero-q">{cur ? cur.title : t("menu.hero.none")}</span>
                {active.length > 1 && <span className="mn-hero-more">{t("menu.hero.more", { count: active.length - 1 })}</span>}
              </span>
            </span>
          </button>
        </Cell>

        <Cell name="character" i={1}>
          <Tile name="character" title="Character" sub={t("menu.tiles.character")} icon={<HelmetIcon />} k="P" onClick={() => openOver(() => openCharacter())} />
        </Cell>
        <Cell name="temporal" i={2}>
          <Tile
            name="temporal"
            title="Bounties"
            sub={t("menu.tiles.temporal")}
            icon={<Skull />}
            onClick={() => goTo("temporal")}
            extra={
              urgent > 0 && (
                <span className="mn-badge" title={t("temporal.section.attention", { count: urgent })}>
                  <b className="num">{urgent}</b>
                </span>
              )
            }
          />
        </Cell>

        <Cell name="merchant" i={3}>
          <Tile
            name="merchant"
            title="Merchant"
            sub={t("menu.tiles.merchant")}
            icon={<LanternIcon />}
            k="C"
            onClick={() => openOver(() => openMerchant())}
            art={<img className="mn-hutao" src={HUTAO} alt="" draggable={false} />}
            extra={
              <span className="mn-chip is-time" title={t("menu.showcaseTitle")}>
                <ClockIcon />
                {t("menu.showcase", { count: days })}
              </span>
            }
          />
        </Cell>
        <Cell name="collection" i={4}>
          <div className="mn-tile is-collection" role="group" aria-label={t("menu.tiles.collection")}>
            <span className="mn-tile-bg" aria-hidden />
            <span className="mn-col-h" aria-hidden>
              <span className="mn-logo">
                <BagIcon />
              </span>
              <b className="mn-title">Collection</b>
              <span className="mn-sub">{t("menu.tiles.collection")}</span>
              <span className="mn-col-n num">{num(units)}</span>
              <kbd className="mn-key">I</kbd>
            </span>
            <span className="mn-col-btns">
              <ColButton title="Inventory" sub={t("menu.tiles.inventory")} icon={<BagIcon />} onClick={() => openOver(() => setCollection("inventory"))} />
              <ColButton title="Almanac" sub={t("menu.tiles.almanac")} icon={<AlmanacIcon />} onClick={() => openOver(() => setCollection("almanac"))} />
            </span>
          </div>
        </Cell>

        <Cell name="chronicle" i={5}>
          <Tile name="chronicle" title="Chronicle" sub={t("menu.tiles.chronicle")} icon={<DiaryIcon />} k="J" onClick={() => openOver(() => openChronicle())} />
        </Cell>
        <Cell name="calendar" i={6}>
          <Tile name="calendar" title="Calendar" sub={t("menu.tiles.calendar")} icon={<CalendarIcon />} onClick={() => goTo("calendar")} />
        </Cell>
        <Cell name="search" i={7}>
          <Tile name="search" title="Search" sub={t("menu.tiles.search")} icon={<SearchIcon />} k="/" onClick={searchFromMenu} />
        </Cell>
        <Cell name="customize" i={8}>
          <Tile name="customize" title="Customize" sub={t("menu.tiles.customize")} icon={<BrushIcon />} onClick={() => openOver(() => openCustomize())} />
        </Cell>
      </div>
    </nav>
  );
}

/** Las dos mitades doradas de «Collection»: inventario y almanaque (la tecla I va en la cabecera). */
function ColButton({ title, sub, icon, onClick }: { title: string; sub: string; icon: ReactNode; onClick(): void }) {
  return (
    <button className="mn-col-btn" onClick={onClick} title={sub} aria-label={sub}>
      <span className="mn-col-bg" aria-hidden>
        <span className="mn-col-mark">{icon}</span>
      </span>
      <span className="mn-col-in" aria-hidden>
        <b className="mn-title">{title}</b>
        <span className="mn-sub">{sub}</span>
      </span>
    </button>
  );
}

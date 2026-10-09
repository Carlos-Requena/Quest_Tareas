import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { useNow } from "../../../lib/time";
import { num } from "../../../i18n";
import { sfx } from "../../../lib/sfx";
import { GoldIcon } from "../../../components/Header";
import { BagIcon, ItemArt, rarityStyle } from "../../items";
import { LanternIcon, openMerchant } from "../../merchant";
import { collectibleOffer } from "../../collectibles/model";
import { closeMenu, openOver } from "../actions";
import { daypart, daysUntil, voiceLine } from "../model";
import { BackIcon, ClockIcon, SwapIcon } from "./MenuIcons";
import { useMenuUi } from "../ui";

const EASE = [0.16, 1, 0.3, 1] as const;
/** Entrada de los paneles de la izquierda, detrás del barrido. */
const enter = (delay: number) => ({
  initial: { opacity: 0, x: -26 },
  animate: { opacity: 1, x: 0 },
  transition: { delay, duration: 0.55, ease: EASE },
});

/** «‹ Volver»: cierra el menú y deja ver la sección en la que estabas. */
export function MenuBack() {
  const { t } = useTranslation();
  return (
    <button className="mn-back" onClick={closeMenu} title={t("menu.backTitle")}>
      <BackIcon />
      <span>{t("menu.back")}</span>
      <kbd>Esc</kbd>
    </button>
  );
}

/** Arriba a la derecha, como las monedas de un gacha: la fecha, el oro y los objetos (con su «+»). */
export function MenuCurrency() {
  const gold = useGame((s) => s.state.player.gold);
  const units = useGame((s) => Object.values(s.state.player.inventory).reduce((a, b) => a + b, 0));
  const now = useNow(15_000);
  const { t } = useTranslation();
  const d = new Date(now);
  const p2 = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="mn-cur">
      <time className="mn-clock num" dateTime={d.toISOString()}>
        {d.getFullYear()}/{p2(d.getMonth() + 1)}/{p2(d.getDate())} {p2(d.getHours())}:{p2(d.getMinutes())}
      </time>
      <button className="mn-coin" title={t("merchant.openTitle")} onClick={() => openOver(() => openMerchant())}>
        <GoldIcon />
        <b className="num">{num(gold)}</b>
        <span className="mn-coin-u">G</span>
        <span className="mn-plus" aria-hidden>
          +
        </span>
      </button>
      <button className="mn-coin" title={t("items.openTitle")} onClick={() => openOver(() => useGame.getState().setCollection("inventory"))}>
        <BagIcon />
        <b className="num">{num(units)}</b>
        <span className="mn-plus" aria-hidden>
          +
        </span>
      </button>
    </div>
  );
}

const R = 44;
const CIRC = 2 * Math.PI * R;

/** El aventurero: nivel en un anillo que se llena con la XP del nivel, y el rango en su rombo. */
export function MenuPlayer() {
  const p = useGame((s) => s.state.player);
  const { t } = useTranslation();
  const pct = Math.min(1, p.levelXp / Math.max(1, p.levelXpNeeded));
  return (
    <motion.div className="mn-player" {...enter(0.2)}>
      <div className="mn-ring" title={t("header.xpTotal", { xp: num(p.xp) })}>
        <svg viewBox="0 0 100 100" aria-hidden>
          <circle className="mn-ring-track" cx="50" cy="50" r={R} />
          <motion.circle
            className="mn-ring-fill"
            cx="50"
            cy="50"
            r={R}
            strokeDasharray={CIRC}
            initial={{ strokeDashoffset: CIRC }}
            animate={{ strokeDashoffset: CIRC * (1 - pct) }}
            transition={{ delay: 0.45, duration: 1.1, ease: EASE }}
          />
        </svg>
        <b className="num mn-ring-lv">{p.level}</b>
        <span className="mn-ring-lbl">LV</span>
      </div>
      <div className="mn-id">
        <span className="tag mn-id-tag">Adventurer</span>
        <span className="mn-id-rank">
          <span className="mn-rank-gem">
            <b className="num">{p.rank}</b>
          </span>
          <span>{t("header.adventurer")}</span>
        </span>
        <span className="mn-id-xp num">
          {num(p.levelXp)}
          <small> / {num(p.levelXpNeeded)} XP</small>
        </span>
      </div>
    </motion.div>
  );
}

/**
 * Lo que dice el personaje de hoy, según la hora: se escribe de izquierda a derecha al abrir
 * el menú: una de las frases que le ha escrito el jugador (features/customize) o la de serie.
 * Junto a su nombre, el botón para cambiar de personaje (MenuCast).
 */
export function MenuVoice({ speaker, characterId }: { speaker: string; characterId?: string }) {
  const now = useNow(60_000);
  const { t } = useTranslation();
  const part = daypart(new Date(now).getHours());
  // Una de las frases que el jugador le ha escrito para esta hora (al azar cada vez que se
  // abre el menú); sin ninguna, la de serie.
  const lines = useGame((s) => s.state.voiceLines);
  const [seed] = useState(Math.random);
  const text = (characterId && voiceLine(lines.values(), characterId, part, seed)) || t(`menu.voice.${part}`);
  return (
    <motion.div className="mn-voice" {...enter(0.3)}>
      <span className="mn-voice-who">
        <span className="tag">Voice</span>
        <span className="mn-voice-name">{speaker}</span>
        <button
          className="mn-voice-swap"
          title={t("menu.cast.open")}
          aria-label={t("menu.cast.open")}
          onClick={() => {
            sfx.move();
            useMenuUi.getState().setCast(true);
          }}
        >
          <SwapIcon />
          <span>{t("menu.cast.title")}</span>
        </button>
      </span>
      <motion.p
        key={`${part}-${speaker}-${text}`}
        initial={{ clipPath: "inset(0 100% 0 0)" }}
        animate={{ clipPath: "inset(0 0% 0 0)" }}
        transition={{ delay: 0.55, duration: 1.1, ease: "linear" }}
      >
        {text}
      </motion.p>
    </motion.div>
  );
}

/**
 * Cartel de abajo a la izquierda, como las noticias de un gacha: el coleccionable que vende Hu Tao
 * esta semana (features/collectibles), del color de su rareza. Abre su pestaña en la tienda.
 */
export function WeeklyNews() {
  const items = useGame((s) => s.state.items);
  const inventory = useGame((s) => s.state.player.inventory);
  const bought = useGame((s) => s.state.player.collectiblesBought);
  const now = useNow(60_000);
  const { t } = useTranslation();
  const offer = useMemo(() => collectibleOffer(items.values(), inventory, bought, now), [items, inventory, bought, now]);
  const item = offer.item;
  const days = daysUntil(offer.endsAt, now);

  return (
    <motion.button
      className={`mn-news ${item ? `is-${item.rarity}` : "is-empty"} ${offer.sold ? "is-sold" : ""}`}
      style={item ? rarityStyle(item) : undefined}
      onClick={() => openOver(() => openMerchant(item ? "collectible" : "showcase"))}
      title={t("merchant.openTitle")}
      {...enter(0.42)}
    >
      <span className="mn-news-tag">Weekly Rarity</span>
      <span className="mn-news-art">
        {item ? (
          <ItemArt item={item} sharp />
        ) : (
          <span className="mn-news-lantern">
            <LanternIcon />
          </span>
        )}
      </span>
      <span className="mn-news-txt">
        <b className="mn-news-name">{item ? item.name : t("merchant.open")}</b>
        <span className="mn-news-sub">
          {!item ? t("menu.weekly.none") : offer.sold ? t("menu.weekly.sold") : `${t("collectibles.title")} · ${t(`items.rarity.${item.rarity}`)}`}
        </span>
        <span className="mn-news-time" title={t("menu.showcaseTitle")}>
          <ClockIcon />
          {t("menu.showcase", { count: days })}
        </span>
      </span>
    </motion.button>
  );
}

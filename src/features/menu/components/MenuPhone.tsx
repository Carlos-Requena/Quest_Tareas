import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { useNow } from "../../../lib/time";
import { calm } from "../../../lib/fx";
import { sfx } from "../../../lib/sfx";
import { num } from "../../../i18n";
import { GoldIcon } from "../../../components/Header";
import { BACKDROP_EXIT, MODAL_EXIT } from "../../../lib/motion";
import { BagIcon, ItemArt, rarityStyle } from "../../items";
import { LanternIcon, nextWeekStart, openMerchant } from "../../merchant";
import { HelmetIcon, openCharacter } from "../../equipment";
import { DiaryIcon, openChronicle } from "../../chronicle";
import { SearchIcon } from "../../search";
import { openCustomize } from "../../customize/ui";
import { BrushIcon } from "../../customize/components/CustomizeIcons";
import { collectibleOffer } from "../../collectibles/model";
import { goTo, openOver, searchFromMenu } from "../actions";
import { activeQuests, daypart, daysUntil, voiceLine } from "../model";
import { useMenuUi } from "../ui";
import { AlmanacIcon, ClockIcon, GearIcon, SwapIcon } from "./MenuIcons";
import { MenuSettings } from "./MenuSettings";
import { SheetGrip, useDragDismiss } from "../../mobile";

const HUTAO = `${import.meta.env.BASE_URL}merchant/hutao.webp`;
const EASE = [0.16, 1, 0.3, 1] as const;

/** Entrada de cada pieza detrás del barrido: desde un lado (x) o desde abajo (y). */
const enter = (delay: number, from: { x?: number; y?: number }) =>
  calm()
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
    : { initial: { opacity: 0, ...from }, animate: { opacity: 1, x: 0, y: 0 }, transition: { delay, duration: 0.5, ease: EASE } };

/**
 * Menú de opciones en el teléfono, al estilo de la pantalla de inicio de un gacha: el personaje
 * del día a toda pantalla y, alrededor, botones redondos; abajo, lo que dice y el botón grande de
 * «Quests». La barra de abajo (features/mobile) flota encima, como en el resto de pantallas.
 */
export function MenuPhone({ speaker, characterId }: { speaker: string; characterId?: string }) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(false);
  const setCollection = useGame((s) => s.setCollection);
  // La hoja de ajustes se cierra también arrastrando su asa hacia abajo (features/mobile, drag.ts).
  const drag = useDragDismiss<HTMLDivElement>({ axis: "y", handle: true, onDismiss: () => setSettings(false) });

  return (
    <div className="mnp">
      <PhoneTop />

      <motion.div className="mnp-col is-left" {...enter(0.25, { x: -30 })}>
        <Round
          icon={<SwapIcon />}
          label={t("menu.phone.swap")}
          onClick={() => {
            sfx.move();
            useMenuUi.getState().setCast(true);
          }}
        />
        <Round icon={<SearchIcon />} label={t("menu.phone.search")} onClick={searchFromMenu} />
        <Round
          icon={<GearIcon />}
          label={t("menu.settings.title")}
          onClick={() => {
            sfx.move();
            setSettings(true);
          }}
        />
      </motion.div>

      <motion.div className="mnp-col is-right" {...enter(0.25, { x: 30 })}>
        <Round icon={<HelmetIcon />} label={t("menu.phone.character")} onClick={() => openOver(() => openCharacter())} />
        <Round icon={<BagIcon />} label={t("menu.tiles.inventory")} onClick={() => openOver(() => setCollection("inventory"))} />
        <Round icon={<AlmanacIcon />} label={t("menu.tiles.almanac")} onClick={() => openOver(() => setCollection("almanac"))} />
        <Round icon={<DiaryIcon />} label={t("menu.phone.chronicle")} onClick={() => openOver(() => openChronicle())} />
        <Round icon={<BrushIcon />} label={t("menu.phone.customize")} onClick={() => openOver(() => openCustomize())} />
      </motion.div>

      <PhoneBottom speaker={speaker} characterId={characterId} />

      <AnimatePresence>
        {settings && (
          <motion.div
            key="settings"
            className="mnp-sheet-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={BACKDROP_EXIT}
            onClick={(e) => e.target === e.currentTarget && setSettings(false)}
          >
            <div className="mnp-sheet-pos" {...drag}>
              <motion.div
                className="mnp-sheet"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%", transition: MODAL_EXIT }}
                transition={{ type: "spring", stiffness: 380, damping: 36 }}
              >
                <SheetGrip />
                <button className="mnp-sheet-x" onClick={() => (sfx.move(), setSettings(false))} aria-label={t("menu.cast.close")}>
                  ✕
                </button>
                <MenuSettings />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Botón redondo con su nombre debajo, como los de los lados de la pantalla de un gacha. */
function Round({ icon, label, onClick }: { icon: ReactNode; label: string; onClick(): void }) {
  return (
    <button className="mnp-round" onClick={onClick} aria-label={label}>
      <span className="mnp-round-ico" aria-hidden>
        {icon}
      </span>
      <span className="mnp-round-lbl" aria-hidden>
        {label}
      </span>
    </button>
  );
}

/** Arriba: el nivel en su círculo, el rango y la XP; a la derecha, el oro y los objetos con su «+». */
function PhoneTop() {
  const { t } = useTranslation();
  const p = useGame((s) => s.state.player);
  const units = useGame((s) => Object.values(s.state.player.inventory).reduce((a, b) => a + b, 0));
  const pct = Math.min(100, (p.levelXp / Math.max(1, p.levelXpNeeded)) * 100);
  return (
    <motion.div className="mnp-top" {...enter(0.15, { y: -16 })}>
      <div className="mnp-lv" title={t("header.xpTotal", { xp: num(p.xp) })}>
        <span className="mnp-lv-lbl">LV</span>
        <b className="num">{p.level}</b>
      </div>
      <div className="mnp-id">
        <span className="mnp-rank">
          <span className="mn-rank-gem">
            <b className="num">{p.rank}</b>
          </span>
          {t("header.adventurer")}
        </span>
        <span className="mnp-xp" aria-hidden>
          <i style={{ width: `${pct}%` }} />
        </span>
        <span className="mnp-xp-n num">
          {num(p.levelXp)} / {num(p.levelXpNeeded)} XP
        </span>
      </div>
      <div className="mnp-cur">
        <button className="mnp-coin" title={t("merchant.openTitle")} onClick={() => openOver(() => openMerchant())}>
          <GoldIcon />
          <b className="num">{num(p.gold)}</b>
          <span className="mnp-plus" aria-hidden>
            +
          </span>
        </button>
        <button className="mnp-coin" title={t("items.openTitle")} onClick={() => openOver(() => useGame.getState().setCollection("inventory"))}>
          <BagIcon />
          <b className="num">{num(units)}</b>
          <span className="mnp-plus" aria-hidden>
            +
          </span>
        </button>
      </div>
    </motion.div>
  );
}

/**
 * Encima del arco: lo que dice el personaje, el botón grande de «Quests» (vuelve al tablón) y, a
 * los lados, la rareza de la semana y la tienda de Hu Tao, con los días que faltan para el cambio.
 */
function PhoneBottom({ speaker, characterId }: { speaker: string; characterId?: string }) {
  const { t } = useTranslation();
  const quests = useGame((s) => s.state.quests);
  const items = useGame((s) => s.state.items);
  const inventory = useGame((s) => s.state.player.inventory);
  const bought = useGame((s) => s.state.player.collectiblesBought);
  const lines = useGame((s) => s.state.voiceLines);
  const now = useNow(60_000);
  const [seed] = useState(Math.random);
  const active = useMemo(() => activeQuests(quests.values()), [quests]);
  const offer = useMemo(() => collectibleOffer(items.values(), inventory, bought, now), [items, inventory, bought, now]);
  const days = daysUntil(nextWeekStart(now), now);
  const part = daypart(new Date(now).getHours());
  const text = (characterId && voiceLine(lines.values(), characterId, part, seed)) || t(`menu.voice.${part}`);
  const cur = active[0];

  return (
    <div className="mnp-bottom">
      <motion.div className="mnp-voice" {...enter(0.35, { y: 16 })}>
        <span className="mnp-voice-who">{speaker}</span>
        <motion.p
          key={`${part}-${speaker}-${text}`}
          initial={calm() ? false : { clipPath: "inset(0 100% 0 0)" }}
          animate={{ clipPath: "inset(0 0% 0 0)" }}
          transition={{ delay: 0.6, duration: 1, ease: "linear" }}
        >
          {text}
        </motion.p>
      </motion.div>

      <div className="mnp-act">
        <motion.button
          className={`mnp-side is-weekly ${offer.item ? `is-${offer.item.rarity}` : ""}`}
          style={offer.item ? (rarityStyle(offer.item) as CSSProperties) : undefined}
          onClick={() => openOver(() => openMerchant(offer.item ? "collectible" : "showcase"))}
          aria-label={t("menu.phone.weekly")}
          {...enter(0.4, { x: -24 })}
        >
          <span className="mnp-side-tag">{offer.sold ? t("menu.phone.sold") : "Weekly"}</span>
          <span className="mnp-side-art" aria-hidden>
            {offer.item ? <ItemArt item={offer.item} sharp /> : <LanternIcon />}
          </span>
          <span className="mnp-side-lbl" aria-hidden>
            {t("menu.phone.weekly")}
          </span>
        </motion.button>

        <motion.button className="mnp-quests" onClick={() => goTo("board")} aria-label={t("menu.tiles.board")} {...enter(0.3, { y: 24 })}>
          <span className="mnp-quests-n num" aria-hidden>
            {active.length}
          </span>
          <span className="mnp-quests-txt" aria-hidden>
            <b className="mnp-quests-title">Quests</b>
            <span className="mnp-quests-cur">{cur ? cur.title : t("menu.hero.none")}</span>
          </span>
        </motion.button>

        <motion.button className="mnp-side is-shop" onClick={() => openOver(() => openMerchant())} aria-label={t("menu.tiles.merchant")} {...enter(0.4, { x: 24 })}>
          <span className="mnp-side-tag" title={t("menu.showcaseTitle")}>
            <ClockIcon />
            {t("menu.showcase", { count: days })}
          </span>
          <span className="mnp-side-art" aria-hidden>
            <img src={HUTAO} alt="" draggable={false} />
          </span>
          <span className="mnp-side-lbl" aria-hidden>
            {t("menu.phone.shop")}
          </span>
        </motion.button>
      </div>
    </div>
  );
}

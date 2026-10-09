import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useGame } from "../../../store/game";
import { GoldIcon } from "../../../components/Header";
import { sfx } from "../../../lib/sfx";
import { formatRemaining, useNow } from "../../../lib/time";
import { LANGS, currentLang, num } from "../../../i18n";
import { rarityTier } from "../../items/model";
import { buyGear, type BuyResult } from "../actions";
import {
  buyBlocker,
  isDecorSlot,
  nextShowing,
  priceOf,
  rankRequired,
  showcase,
  sortGear,
  starsOf,
  type GearDef,
} from "../model";
import { useMerchantUi, type MerchantTab } from "../ui";
import { HuTaoStage } from "./HuTaoStage";
import { OfferPanel } from "../../collectibles/components/OfferPanel";
import { collectibleOffer, collectiblePrice } from "../../collectibles/model";
import { buyCollectible } from "../../collectibles/actions";
import type { ItemDef } from "../../items/model";
import { gearName } from "../../armory/labels";
import { GearArt, gearStyle } from "./GearArt";
import { GearDetail } from "./GearDetail";
import { GearForm } from "./GearForm";
import { SoldSeal, type Sale } from "./SoldSeal";
import "../merchant.css";
import { BACKDROP_EXIT, MODAL_EXIT } from "../../../lib/motion";
import { SheetClose, isPhone } from "../../mobile";

const TABS: MerchantTab[] = ["showcase", "collectible", "catalog"];
type Group = "all" | "armor" | "decor";
const GROUPS: Group[] = ["all", "armor", "decor"];
type Mode = { kind: "view" } | { kind: "create" } | { kind: "edit"; id: string };

/** Lo que dice Hu Tao: el tipo de frase, cuál de la lista y sus datos. Se traduce al pintar. */
type LineKind = "welcome" | "empty" | "catalog" | "ok" | "gold" | "rank" | "away" | "owned" | "bought" | "rare" | "soldOut" | "noRare";
interface Line {
  kind: LineKind;
  n: number;
  vars?: Record<string, string>;
}
const line = (kind: LineKind, vars?: Record<string, string>): Line => ({ kind, n: Math.floor(Math.random() * 1000), vars });

function lineText(t: TFunction, l: Line): string {
  const all = t(`merchant.lines.${l.kind}`, { returnObjects: true, ...l.vars }) as unknown as string[];
  return Array.isArray(all) && all.length ? all[l.n % all.length] : "";
}

/** Ventana del mercader: Hu Tao, su escaparate de la semana, el coleccionable de la semana (features/collectibles) y el catálogo completo. */
export function MerchantModal() {
  const open = useMerchantUi((s) => s.open);
  return <AnimatePresence>{open && <Modal />}</AnimatePresence>;
}

function Modal() {
  const { t } = useTranslation();
  const tab = useMerchantUi((s) => s.tab);
  const gear = useGame((s) => s.state.gear);
  const items = useGame((s) => s.state.items);
  const player = useGame((s) => s.state.player);
  const now = useNow(30_000);

  const [group, setGroup] = useState<Group>("all");
  const [selectedId, setSelectedId] = useState<string>();
  const [mode, setMode] = useState<Mode>({ kind: "view" });
  const [armed, setArmed] = useState<string>();
  const [sale, setSale] = useState<Sale>();
  const stage = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const sc = useMemo(() => showcase(gear.values(), player.owned, now), [gear, player.owned, now]);
  const offer = useMemo(
    () => collectibleOffer(items.values(), player.inventory, player.collectiblesBought, now),
    [items, player.inventory, player.collectiblesBought, now],
  );
  const all = useMemo(() => sortGear(gear.values()), [gear]);
  const inTab = tab === "showcase" ? all.filter((g) => sc.ids.has(g.id)) : all;
  const visible = group === "all" ? inTab : inTab.filter((g) => (group === "decor") === isDecorSlot(g.slot));
  const selected = selectedId ? gear.get(selectedId) : undefined;

  const greeting = (forTab: MerchantTab) =>
    forTab === "catalog"
      ? line(all.length ? "catalog" : "empty")
      : forTab === "collectible"
        ? line(!offer.item ? "noRare" : offer.sold ? "soldOut" : "rare")
        : line(sc.ids.size ? "welcome" : "empty");
  const [say, setSay] = useState<Line>(() => greeting(tab));

  const close = () => useMerchantUi.getState().setOpen(false);

  /** Lo que comenta Hu Tao al ver (o intentar comprar) una pieza. */
  const lineFor = (g: GearDef, why: BuyResult | undefined): Line => {
    switch (why) {
      case undefined:
      case "ok":
        return line("ok");
      case "owned":
        return line("owned");
      case "rank":
        return line("rank", { rank: rankRequired(g) });
      case "gold":
        return line("gold", { gold: num(Math.max(0, priceOf(g) - player.gold)) });
      case "away": {
        const back = nextShowing(g.id, all, player.owned, now);
        const when = back
          ? t("merchant.when.backOn", { date: new Date(back).toLocaleDateString(LANGS[currentLang()].locale, { day: "numeric", month: "long" }) })
          : t("merchant.when.unknown");
        return line("away", { when });
      }
      default:
        return line("welcome");
    }
  };

  const select = (id: string) => {
    const g = gear.get(id);
    if (!g) return;
    if (id !== selectedId) sfx.move();
    setSelectedId(id);
    setArmed(undefined);
    setMode({ kind: "view" });
    setSay(lineFor(g, buyBlocker(g, player, sc.ids.has(id))));
  };

  /** Cierra la ficha (en el teléfono tapa media pantalla): ✕ o volver a tocar la fila. */
  const deselect = () => {
    setSelectedId(undefined);
    setArmed(undefined);
    setSay(greeting(tab));
  };

  const goTab = (next: MerchantTab) => {
    if (next === tab) return;
    sfx.move();
    setMode({ kind: "view" });
    setArmed(undefined);
    useMerchantUi.getState().setTab(next);
    setSay(greeting(next));
  };

  const buy = async (g: GearDef) => {
    if (armed !== g.id) {
      // Primer clic (o Enter): pide confirmación. Las compras no tienen vuelta atrás.
      sfx.move();
      setArmed(g.id);
      return;
    }
    setArmed(undefined);
    const r = await buyGear(g.id);
    if (r === "ok") {
      setSale({ key: Date.now(), tier: rarityTier(g.rarity) });
      setSay(line("bought"));
    } else setSay(lineFor(g, r));
  };

  /** Comprar el coleccionable de la semana: también pide confirmación. */
  const buyOffer = async (item: ItemDef) => {
    if (armed !== item.id) {
      sfx.move();
      setArmed(item.id);
      return;
    }
    setArmed(undefined);
    const r = await buyCollectible(item.id);
    if (r === "ok") {
      setSale({ key: Date.now(), tier: rarityTier(item.rarity) });
      setSay(line("bought"));
    } else if (r === "gold") setSay(line("gold", { gold: num(Math.max(0, collectiblePrice(item.rarity) - player.gold)) }));
    else if (r === "soldOut") setSay(line("soldOut"));
    else setSay(greeting("collectible"));
  };

  // Teclado de la ventana (el del tablón espera mientras está abierta).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;
      if (e.key === "Escape") {
        e.preventDefault();
        if (mode.kind !== "view") setMode({ kind: "view" });
        else if (armed) setArmed(undefined);
        else close();
        return;
      }
      if (typing || mode.kind !== "view" || e.metaKey || e.ctrlKey) return;
      // En la pestaña del coleccionable no hay lista: Enter compra el de la semana.
      if (tab === "collectible" && (e.key === "Enter" || e.key.startsWith("Arrow"))) {
        if (e.key === "Enter" && offer.item && !offer.sold) buyOffer(offer.item);
        e.preventDefault();
        return;
      }
      const idx = visible.findIndex((g) => g.id === selectedId);
      switch (e.key) {
        case "c":
        case "C":
          close();
          break;
        case "q":
          goTab(TABS[(TABS.indexOf(tab) + TABS.length - 1) % TABS.length]);
          break;
        case "e":
        case "Tab":
          goTab(TABS[(TABS.indexOf(tab) + 1) % TABS.length]);
          break;
        case "ArrowDown":
        case "ArrowUp": {
          if (!visible.length) return;
          const d = e.key === "ArrowDown" ? 1 : -1;
          const next = visible[idx < 0 ? 0 : Math.max(0, Math.min(visible.length - 1, idx + d))];
          select(next.id);
          listRef.current?.querySelector(`[data-id="${next.id}"]`)?.scrollIntoView({ block: "nearest" });
          break;
        }
        case "Enter":
          if (selected && !player.owned[selected.id]) buy(selected);
          break;
        case "n":
          setMode({ kind: "create" });
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const owned = all.filter((g) => player.owned[g.id]).length;

  let side;
  if (mode.kind === "create") {
    side = (
      <GearForm
        onDone={(id) => {
          setMode({ kind: "view" });
          if (id) {
            setSelectedId(id);
            const g = useGame.getState().state.gear.get(id);
            if (g) setSay(lineFor(g, undefined));
          }
        }}
      />
    );
  } else if (mode.kind === "edit" && gear.get(mode.id)) {
    side = <GearForm key={mode.id} gear={gear.get(mode.id)} onDone={() => setMode({ kind: "view" })} />;
  }

  return (
    <motion.div
      className="modal-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={BACKDROP_EXIT}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <motion.div
        className="modal mshop"
        style={{ "--cat": "var(--merchant)" } as CSSProperties}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98, transition: MODAL_EXIT }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
      >
        <header className="modal-h mshop-h">
          <span className="gem" />
          <span className="tag">Merchant</span>
          <span className="sec-sub">{t("merchant.shop")}</span>
          <div className="tabs mshop-tabs" role="tablist">
            {TABS.map((id) => (
              <button key={id} role="tab" aria-selected={tab === id} className={`tab ${tab === id ? "on" : ""}`} onClick={() => goTab(id)}>
                {tab === id && <motion.span layoutId="mshop-tab-hl" className="tab-hl" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                <span className="tab-lbl">{t(`merchant.tabs.${id}`)}</span>
              </button>
            ))}
          </div>
          <span className="mshop-gold" title={t("merchant.gold")}>
            <GoldIcon />
            <b className="num">{num(player.gold)}</b>
            <span className="muted">G</span>
          </span>
          <button className="icon-btn mshop-x" onClick={close} title={t("merchant.close")}>
            ✕
          </button>
        </header>

        <div className="mshop-body">
          <section className="mshop-stage">
            <HuTaoStage ref={stage} line={lineText(t, say)}>
              <SoldSeal sale={sale} stage={stage} />
            </HuTaoStage>
            <p className="mshop-clock muted">
              <span className="mshop-clock-dot" aria-hidden />
              {t("merchant.changesIn", { time: formatRemaining(sc.endsAt - now) })}
              {tab !== "collectible" && (
                <>
                  <span className="mshop-clock-sep">·</span>
                  {t("merchant.forSale", { count: sc.ids.size })}
                </>
              )}
            </p>
          </section>

          <section className="mshop-goods">
            {side ?? (tab === "collectible" ? (
              <OfferPanel offer={offer} armed={!!offer.item && armed === offer.item.id} onBuy={() => offer.item && buyOffer(offer.item)} />
            ) : (
              <>
                <div className="mshop-filter">
                  {GROUPS.map((g) => (
                    <button key={g} className={`mshop-chip ${group === g ? "on" : ""}`} onClick={() => (sfx.move(), setGroup(g))}>
                      {g === "all" ? t("merchant.all") : t(`merchant.chip.${g}`)}
                    </button>
                  ))}
                  {tab === "catalog" && <span className="mshop-count muted">{t("merchant.catalogCount", { owned, total: all.length })}</span>}
                </div>

                <div className="mshop-list" ref={listRef}>
                  {visible.map((g) => (
                    <GearRow
                      key={g.id}
                      gear={g}
                      selected={g.id === selectedId}
                      fresh={sc.fresh.has(g.id)}
                      onSale={sc.ids.has(g.id)}
                      catalog={tab === "catalog"}
                      onClick={() => (isPhone() && g.id === selectedId ? (sfx.move(), deselect()) : select(g.id))}
                    />
                  ))}
                  {visible.length === 0 && (
                    <p className="mshop-empty muted">
                      {all.length === 0 ? t("merchant.emptyCatalog") : inTab.length === 0 ? t("merchant.emptyShowcase") : t("merchant.emptyFilter")}
                    </p>
                  )}
                </div>

                <div className={`mshop-detail ${selected ? "" : "is-empty"}`}>
                  {selected && <SheetClose onClose={deselect} />}
                  {selected ? (
                    <GearDetail
                      key={selected.id}
                      gear={selected}
                      onSale={sc.ids.has(selected.id)}
                      backOn={sc.ids.has(selected.id) || player.owned[selected.id] ? undefined : nextShowing(selected.id, all, player.owned, now)}
                      armed={armed === selected.id}
                      onBuy={() => buy(selected)}
                      onEdit={() => setMode({ kind: "edit", id: selected.id })}
                    />
                  ) : (
                    <p className="mshop-hint muted">{t("merchant.pickHint")}</p>
                  )}
                </div>
              </>
            ))}
          </section>
        </div>

        <footer className="modal-f">
          <span className="muted hint">
            <kbd>Q</kbd>
            <kbd>E</kbd> {t("merchant.keys.tabs")} · <kbd>↑</kbd>
            <kbd>↓</kbd> {t("merchant.keys.pick")} · <kbd>Enter</kbd> {t("merchant.keys.buy")} · <kbd>Esc</kbd> {t("merchant.keys.close")}
          </span>
          <button className="btn btn-primary mshop-new" onClick={() => setMode({ kind: "create" })}>
            <span className="btn-key">N</span>
            {t("merchant.newGear")}
          </button>
        </footer>
      </motion.div>
    </motion.div>
  );
}

interface RowProps {
  gear: GearDef;
  selected: boolean;
  fresh: boolean;
  onSale: boolean;
  catalog: boolean;
  onClick(): void;
}

/** Fila de la lista: arte, nombre, tipo y estrellas, y el precio (o si ya es tuya). */
function GearRow({ gear, selected, fresh, onSale, catalog, onClick }: RowProps) {
  const { t } = useTranslation();
  const player = useGame((s) => s.state.player);
  const owned = !!player.owned[gear.id];
  const worn = player.equipped[gear.slot] === gear.id;
  const price = priceOf(gear);
  const tooLow = !owned && buyBlocker(gear, player, true) === "rank";
  const poor = !owned && player.gold < price;

  return (
    <button
      data-id={gear.id}
      className={`grow ${selected ? "is-selected" : ""} ${owned ? "is-owned" : ""} ${catalog && !owned && !onSale ? "is-away" : ""}`}
      style={gearStyle(gear)}
      onClick={onClick}
    >
      <GearArt gear={gear} stars={false} className="grow-art" />
      <span className="grow-main">
        <span className="grow-name">
          {gearName(gear, t)}
          {fresh && <span className="grow-new tag">NEW</span>}
        </span>
        <span className="grow-sub">
          {t(`merchant.slot.${gear.slot}`)}
          <span className="grow-stars" aria-hidden>
            {"★".repeat(starsOf(gear))}
          </span>
        </span>
      </span>
      <span className="grow-end">
        {owned ? (
          <span className="grow-owned">{worn ? t("merchant.state.worn") : t("merchant.state.owned")}</span>
        ) : (
          <>
            <span className={`grow-price ${poor ? "is-poor" : ""}`}>
              <GoldIcon />
              <b className="num">{num(price)}</b>
            </span>
            {tooLow && <span className="grow-rank">{t("merchant.detail.rank", { rank: rankRequired(gear) })}</span>}
            {catalog && !onSale && <span className="grow-away">{t("merchant.state.away")}</span>}
          </>
        )}
      </span>
    </button>
  );
}

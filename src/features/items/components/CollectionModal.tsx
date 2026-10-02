import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useGame, type CollectionTab } from "../../../store/game";
import { sfx } from "../../../lib/sfx";
import { num } from "../../../i18n";
import { RARITIES, RARITY_META, sortItems, type ItemDef, type Rarity } from "../model";
import { ItemTile } from "./ItemTile";
import { ItemForm } from "./ItemForm";
import { ItemDetail } from "./ItemDetail";
import { DropRates } from "./DropRates";
import { AlmanacBook } from "./AlmanacBook";

const TABS: CollectionTab[] = ["inventory", "almanac", "rates"];

/** Ventana de objetos: inventario, almanaque (colección de cromos) y probabilidades de drop. */
export function CollectionModal() {
  const tab = useGame((s) => s.collection);
  return <AnimatePresence>{tab && <Modal tab={tab} />}</AnimatePresence>;
}

type Mode = { kind: "view" } | { kind: "create" } | { kind: "edit"; id: string };

function Modal({ tab }: { tab: CollectionTab }) {
  const setCollection = useGame((s) => s.setCollection);
  const items = useGame((s) => s.state.items);
  const inventory = useGame((s) => s.state.player.inventory);
  const { t } = useTranslation();

  const [filter, setFilter] = useState<Rarity | "all">("all");
  const [selectedId, setSelectedId] = useState<string>();
  const [mode, setMode] = useState<Mode>({ kind: "view" });

  const all = useMemo(() => sortItems(items.values()), [items]);
  const inTab = tab === "inventory" ? all.filter((i) => (inventory[i.id] ?? 0) > 0) : all;
  const visible = filter === "all" ? inTab : inTab.filter((i) => i.rarity === filter);
  const selected = (selectedId && items.get(selectedId)) || undefined;

  const owned = all.filter((i) => (inventory[i.id] ?? 0) > 0).length;
  const units = Object.values(inventory).reduce((a, b) => a + b, 0);

  /** «3/5» en el almanaque (conseguidos / existentes); «3» en el inventario. */
  const countLabel = (list: ItemDef[]) => {
    const got = list.filter((i) => (inventory[i.id] ?? 0) > 0).length;
    return tab === "inventory" ? `${got}` : `${got}/${list.length}`;
  };

  const close = () => setCollection(undefined);
  const goTab = (next: CollectionTab) => {
    if (next === tab) return;
    sfx.move();
    setMode({ kind: "view" });
    setCollection(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (e.key === "Escape") {
        e.preventDefault();
        if (mode.kind !== "view") setMode({ kind: "view" });
        else close();
      } else if (!typing && mode.kind === "view" && (e.key === "i" || e.key === "I")) {
        close();
      } else if (!typing && mode.kind === "view" && (e.key === "q" || e.key === "e")) {
        const i = TABS.indexOf(tab);
        goTab(TABS[(i + (e.key === "e" ? 1 : -1) + TABS.length) % TABS.length]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const select = (id: string) => {
    if (id !== selectedId) sfx.move();
    setSelectedId(id);
    setMode({ kind: "view" });
  };

  // Panel de la derecha (o página derecha del libro): formulario, ficha o nada.
  let side: ReactNode;
  if (mode.kind === "create") {
    side = (
      <ItemForm
        onDone={(id) => {
          setMode({ kind: "view" });
          if (id) {
            setSelectedId(id);
            if (tab === "inventory") setCollection("almanac");
          }
        }}
      />
    );
  } else if (mode.kind === "edit" && items.get(mode.id)) {
    side = <ItemForm key={mode.id} item={items.get(mode.id)} onDone={() => setMode({ kind: "view" })} />;
  } else if (selected) {
    side = <ItemDetail item={selected} count={inventory[selected.id] ?? 0} onEdit={() => setMode({ kind: "edit", id: selected.id })} />;
  }

  return (
    <motion.div
      className="modal-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <motion.div
        className="modal coll"
        style={{ "--cat": "var(--gold)" } as React.CSSProperties}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
      >
        <header className="modal-h coll-h">
          <span className="gem" />
          <span className="tag">Collection</span>
          <span className="sec-sub">{t("items.collected", { got: owned, total: all.length })}</span>
          <div className="tabs coll-tabs" role="tablist">
            {TABS.map((id) => (
              <button key={id} role="tab" aria-selected={tab === id} className={`tab ${tab === id ? "on" : ""}`} onClick={() => goTab(id)}>
                {tab === id && (
                  <motion.span layoutId="coll-tab-hl" className="tab-hl" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
                )}
                <span className="tab-lbl">{t(`items.tabs.${id}`)}</span>
              </button>
            ))}
          </div>
          <button className="icon-btn coll-x" onClick={close} title={t("items.close")}>
            ✕
          </button>
        </header>

        {tab === "rates" ? (
          <div className="coll-body coll-rates">
            <DropRates />
          </div>
        ) : tab === "almanac" ? (
          <div className="coll-body coll-book">
            <AlmanacBook
              all={all}
              filter={filter}
              setFilter={setFilter}
              inventory={inventory}
              selectedId={selected?.id}
              onSelect={select}
              side={side}
            />
          </div>
        ) : (
          <div className="coll-body">
            <div className="coll-list">
              <div className="coll-filter">
                <FilterChip on={filter === "all"} onClick={() => setFilter("all")} label={t("items.all")} count={countLabel(all)} />
                {RARITIES.map((r) => (
                  <FilterChip
                    key={r}
                    rarity={r}
                    on={filter === r}
                    onClick={() => setFilter(filter === r ? "all" : r)}
                    label={t(`items.rarity.${r}`)}
                    count={countLabel(all.filter((i) => i.rarity === r))}
                  />
                ))}
              </div>

              <div className="coll-grid">
                {visible.map((i) => (
                  <ItemTile
                    key={i.id}
                    item={i}
                    count={inventory[i.id]}
                    selected={i.id === selected?.id}
                    onClick={() => select(i.id)}
                  />
                ))}
                {visible.length === 0 && (
                  <p className="coll-empty muted">
                    {all.length === 0
                      ? t("items.emptyAlmanac")
                      : tab === "inventory" && inTab.length === 0
                        ? t("items.emptyInventory")
                        : t("items.emptyFilter")}
                  </p>
                )}
              </div>
            </div>

            <div className="coll-side">{side ?? <p className="coll-hint muted">{t("items.pickHint")}</p>}</div>
          </div>
        )}

        <footer className="modal-f">
          <span className="muted hint">
            <kbd>Q</kbd>
            <kbd>E</kbd> {t("footer.category")}
            {tab === "almanac" && (
              <>
                {" · "}
                <kbd>←</kbd>
                <kbd>→</kbd> {t("items.book.turn")}
              </>
            )}
            {" · "}
            <kbd>Esc</kbd> {t("modal.close")}
          </span>
          <span className="muted coll-units">{t("items.units", { n: num(units) })}</span>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              sfx.move();
              setMode({ kind: "create" });
              if (tab === "rates") setCollection("almanac");
            }}
          >
            {t("items.newItem")}
          </button>
        </footer>
      </motion.div>
    </motion.div>
  );
}


function FilterChip({ rarity, on, label, count, onClick }: { rarity?: Rarity; on: boolean; label: string; count: string; onClick(): void }) {
  return (
    <button
      type="button"
      className={`ichip ${on ? "on" : ""}`}
      style={{ "--rc": rarity ? RARITY_META[rarity].color : "var(--gold)" } as React.CSSProperties}
      onClick={() => {
        sfx.move();
        onClick();
      }}
    >
      <span className="gem" />
      {label}
      <small className="num">{count}</small>
    </button>
  );
}

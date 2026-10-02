import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { LANGS, currentLang, num } from "../../../i18n";
import { RARITY_META, type ItemDef } from "../model";
import { deleteItem } from "../actions";
import { ItemArt, rarityStyle } from "./ItemTile";

/** Ficha de un objeto: arte, rareza, historia, unidades y acciones. */
export function ItemDetail({ item, count, onEdit }: { item: ItemDef; count: number; onEdit(): void }) {
  const { t } = useTranslation();
  const discovered = useGame((s) => s.state.player.discovered[item.id]);
  const [confirm, setConfirm] = useState(false);
  const meta = RARITY_META[item.rarity];

  useEffect(() => setConfirm(false), [item.id]);
  useEffect(() => {
    if (!confirm) return;
    const timer = setTimeout(() => setConfirm(false), 3000);
    return () => clearTimeout(timer);
  }, [confirm]);

  const date = discovered && new Date(discovered).toLocaleDateString(LANGS[currentLang()].locale, { dateStyle: "long" });

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={item.id}
        className="idetail"
        style={rarityStyle(item)}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
      >
        <div className="idetail-art">
          <ItemArt item={item} />
        </div>
        <div className="idetail-rarity">
          <span className="tag">{meta.tag}</span>
          <span className="sec-sub">{t(`items.rarity.${item.rarity}`)}</span>
        </div>
        <h2 className="idetail-name">{item.name}</h2>
        {item.kind && <p className="idetail-kind muted">{item.kind}</p>}
        {item.description && <p className="desc idetail-desc">{item.description}</p>}

        <ul className="idetail-facts">
          <li className={count ? "is-owned" : ""}>{count ? t("items.detail.owned", { n: num(count) }) : t("items.detail.notOwned")}</li>
          {date && <li>{t("items.detail.firstAt", { date })}</li>}
          <li>{item.droppable ? t("items.detail.droppable") : t("items.detail.notDroppable")}</li>
        </ul>

        <div className="idetail-actions">
          <button className="btn btn-ghost" onClick={onEdit}>
            {t("items.detail.edit")}
          </button>
          <button
            className={`btn btn-ghost ${confirm ? "btn-danger" : ""}`}
            onClick={() => (confirm ? deleteItem(item.id) : setConfirm(true))}
          >
            {confirm ? t("items.detail.deleteConfirm") : t("items.detail.delete")}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

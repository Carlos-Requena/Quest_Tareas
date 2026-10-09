import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { num } from "../../../i18n";
import { GoldIcon } from "../../../components/Header";
import { KIND_GLYPH, RARITY_META, rarityTier } from "../../items/model";
import { ItemArt, rarityStyle } from "../../items/components/ItemTile";
import { OFFER_MIN_RARITY, collectiblePrice, type CollectibleOffer } from "../model";
import "../collectibles.css";

interface Props {
  offer: CollectibleOffer;
  /** El botón de comprar espera la confirmación (como en las piezas del mercader). */
  armed: boolean;
  onBuy(): void;
}

/**
 * Pestaña «Coleccionable» de Hu Tao: el único coleccionable que vende esta semana,
 * mítico o superior y que no tienes. La compra, su sello y lo que dice Hu Tao los
 * lleva la ventana del mercader.
 */
export function OfferPanel({ offer, armed, onBuy }: Props) {
  const { t } = useTranslation();
  const items = useGame((s) => s.state.items);
  const player = useGame((s) => s.state.player);
  const item = offer.item;
  const price = item ? collectiblePrice(item.rarity) : 0;
  const missing = Math.max(0, price - player.gold);
  const anyRare = [...items.values()].some((i) => i.droppable && rarityTier(i.rarity) >= rarityTier(OFFER_MIN_RARITY));

  return (
    <div className="offer">
      <header className="offer-h">
        <span className="tag">Weekly Rarity</span>
        <span className="sec-sub">{t("collectibles.title")}</span>
      </header>

      <AnimatePresence mode="wait">
        {item ? (
          <motion.article
            key={item.id}
            className={`offer-card is-${item.rarity} ${offer.sold ? "is-sold" : ""}`}
            style={rarityStyle(item)}
            initial={{ opacity: 0, y: 14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            <span className="offer-glow" aria-hidden />
            <div className="offer-art">
              <ItemArt item={item} sharp />
              {offer.sold && <span className="offer-seal">{t("collectibles.sold")}</span>}
            </div>
            <div className="offer-info">
              <div className="offer-rarity">
                <span className="tag">{RARITY_META[item.rarity].tag}</span>
                <span className="sec-sub">{t(`items.rarity.${item.rarity}`)}</span>
              </div>
              <h3 className="offer-name">{item.name}</h3>
              <p className="offer-kind muted">
                {KIND_GLYPH[item.kind]} {t(`items.kinds.${item.kind}`)}
              </p>
              {item.description && <p className="desc offer-desc">{item.description}</p>}

              {offer.sold ? (
                <p className="offer-soldnote">{t("collectibles.soldNote")}</p>
              ) : (
                <div className="offer-buy">
                  <span className="offer-price">
                    <GoldIcon />
                    <b className="num">{num(price)}</b>
                    <small className="muted">G</small>
                  </span>
                  <span className={`offer-funds ${missing ? "is-bad" : "is-ok"}`}>
                    {missing ? t("merchant.detail.missingGold", { gold: num(missing) }) : t("merchant.detail.enoughGold")}
                  </span>
                  <button type="button" className={`btn btn-primary gdet-buy ${armed ? "is-armed" : ""}`} onClick={onBuy}>
                    <span className="btn-key">↵</span>
                    {armed ? t("merchant.detail.buyConfirm", { price: num(price) }) : t("merchant.detail.buy")}
                  </button>
                </div>
              )}
            </div>
          </motion.article>
        ) : (
          <motion.p key="none" className="offer-none muted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {anyRare ? t("collectibles.complete") : t("collectibles.empty")}
          </motion.p>
        )}
      </AnimatePresence>

      <p className="offer-foot muted">{t("collectibles.rules")}</p>
    </div>
  );
}

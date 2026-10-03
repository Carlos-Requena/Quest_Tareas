import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { LANGS, currentLang, num } from "../../../i18n";
import { RARITY_META } from "../model";
import type { GearDef } from "../../merchant/model";
import { GearArt, gearStyle } from "../../merchant/components/GearArt";
import { gearDescription, gearName } from "../../armory/labels";
import { armorySource } from "../../armory/model";
import { openMerchant } from "../../merchant/ui";

/**
 * Ficha de una pieza de equipo en el almanaque. Solo para mirar: se compra y se
 * equipa en la ventana de Hu Tao y en la del personaje.
 */
export function GearAlmanacDetail({ gear }: { gear: GearDef }) {
  const { t } = useTranslation();
  const purchase = useGame((s) => s.state.player.owned[gear.id]);
  const worn = useGame((s) => s.state.player.equipped[gear.slot] === gear.id);
  const source = armorySource(gear.id);
  const desc = gearDescription(gear, t);
  const date = purchase && new Date(purchase.at).toLocaleDateString(LANGS[currentLang()].locale, { dateStyle: "long" });

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={gear.id}
        className="idetail"
        style={gearStyle(gear)}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
      >
        <div className="idetail-art">
          <GearArt gear={gear} className="iart" />
        </div>
        <div className="idetail-rarity">
          <span className="tag">{RARITY_META[gear.rarity].tag}</span>
          <span className="sec-sub">{t(`items.rarity.${gear.rarity}`)}</span>
        </div>
        <h2 className="idetail-name">{gearName(gear, t)}</h2>
        <p className="idetail-kind muted">{t(`merchant.slot.${gear.slot}`)}</p>
        {desc && <p className="desc idetail-desc">{desc}</p>}

        <ul className="idetail-facts">
          <li className={purchase ? "is-owned" : ""}>
            {purchase ? t("merchant.detail.boughtOn", { date, price: num(purchase.price) }) : t("items.gear.notOwned")}
          </li>
          {worn && <li>{t("items.gear.worn")}</li>}
          {source && <li>{t("armory.inspired", { source: t(`armory.source.${source}`) })}</li>}
        </ul>

        {!purchase && (
          <div className="idetail-actions">
            <button
              className="btn btn-ghost"
              onClick={() => {
                // Se compra a Hu Tao: el almanaque solo enseña lo que llevas.
                useGame.getState().setCollection(undefined);
                openMerchant("catalog");
              }}
            >
              {t("items.gear.toShop")}
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { GoldIcon } from "../../../components/Header";
import { LANGS, currentLang, num } from "../../../i18n";
import { RARITY_META } from "../../items/model";
import { equipGear } from "../../equipment/actions";
import { deleteGear } from "../actions";
import { isDecorSlot, levelRequired, priceOf, rankRequired, type GearDef } from "../model";
import { GearArt, gearStyle } from "./GearArt";

interface Props {
  gear: GearDef;
  /** A la venta esta semana. */
  onSale: boolean;
  /** Lunes en que vuelve al escaparate (si no está a la venta). */
  backOn?: number;
  /** El botón de comprar espera la confirmación. */
  armed: boolean;
  onBuy(): void;
  onEdit(): void;
}

const dateOf = (ts: number, opts: Intl.DateTimeFormatOptions) => new Date(ts).toLocaleDateString(LANGS[currentLang()].locale, opts);

/** Ficha de una pieza: precio, requisitos, disponibilidad y lo que se puede hacer con ella. */
export function GearDetail({ gear, onSale, backOn, armed, onBuy, onEdit }: Props) {
  const { t } = useTranslation();
  const player = useGame((s) => s.state.player);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const price = priceOf(gear);
  const purchase = player.owned[gear.id];
  const worn = player.equipped[gear.slot] === gear.id;
  const rankOk = player.level >= levelRequired(gear);
  const missing = Math.max(0, price - player.gold);
  const pct = Math.min(100, (player.gold / price) * 100);
  const decor = isDecorSlot(gear.slot);

  return (
    <div className="gdet" style={gearStyle(gear)}>
      <div className="gdet-top">
        <GearArt gear={gear} className="gdet-art" />
        <div className="gdet-id">
          <span className="gdet-rarity tag">{RARITY_META[gear.rarity].tag}</span>
          <h3 className="gdet-name">{gear.name}</h3>
          <span className="gdet-sub">
            {t(`merchant.slot.${gear.slot}`)} · {t(decor ? "merchant.group.decor" : "merchant.group.armor")}
          </span>
        </div>
      </div>

      {gear.description && <p className="gdet-desc">{gear.description}</p>}

      {purchase ? (
        <p className="gdet-owned">
          <span className="gdet-check" aria-hidden>
            ✓
          </span>
          {t("merchant.detail.boughtOn", { date: dateOf(purchase.at, { dateStyle: "long" }), price: num(purchase.price) })}
        </p>
      ) : (
        <dl className="gdet-facts">
          <dt>{t("merchant.detail.price")}</dt>
          <dd className="gdet-price">
            <GoldIcon />
            <b className="num">{num(price)}</b>
            <span className="gdet-bar" title={t("merchant.gold")}>
              <span className="gdet-bar-fill" style={{ width: `${pct}%` }} />
            </span>
            <span className={missing ? "is-bad" : "is-ok"}>
              {missing ? t("merchant.detail.missingGold", { gold: num(missing) }) : t("merchant.detail.enoughGold")}
            </span>
          </dd>
          <dt>{t("merchant.detail.requires")}</dt>
          <dd className={rankOk ? "is-ok" : "is-bad"}>
            {t("merchant.detail.rankLevel", { rank: rankRequired(gear), level: levelRequired(gear) })}
          </dd>
          <dt>{t("merchant.detail.when")}</dt>
          <dd className={onSale ? "is-ok" : "is-bad"}>
            {onSale
              ? t("merchant.state.onSale")
              : backOn
                ? t("merchant.state.backOn", { date: dateOf(backOn, { day: "numeric", month: "long" }) })
                : t("merchant.state.notSoon")}
          </dd>
        </dl>
      )}

      <div className="gdet-actions">
        {purchase ? (
          <button className={`btn btn-primary ${worn ? "is-disabled" : ""}`} disabled={worn} onClick={() => equipGear(gear.id)}>
            {worn ? t("merchant.detail.equipped") : t(decor ? "merchant.detail.equipDecor" : "merchant.detail.equip")}
          </button>
        ) : (
          <button className={`btn btn-primary gdet-buy ${armed ? "is-armed" : ""}`} onClick={onBuy}>
            <span className="btn-key">↵</span>
            {armed ? t("merchant.detail.buyConfirm", { price: num(price) }) : t("merchant.detail.buy")}
          </button>
        )}
        <span className="gdet-manage">
          <button className="add-cond" onClick={onEdit}>
            {t("merchant.detail.edit")}
          </button>
          <button
            className="add-cond is-danger"
            onClick={() => (confirmDelete ? deleteGear(gear.id) : setConfirmDelete(true))}
            onMouseLeave={() => setConfirmDelete(false)}
            title={purchase ? t("merchant.detail.deleteOwned") : undefined}
          >
            {confirmDelete ? t("merchant.detail.deleteConfirm") : t("merchant.detail.delete")}
          </button>
        </span>
      </div>
    </div>
  );
}

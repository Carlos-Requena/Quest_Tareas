import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { LANGS, currentLang } from "../../../i18n";
import { DROP_TABLES, PITY_RULES, RARITIES, RARITY_META, legendaryChance, type DropTableId } from "../model";

const pct = (p: number) =>
  `${(p * 100).toLocaleString(LANGS[currentLang()].locale, { maximumFractionDigits: 1 })} %`;

/** Tablas de probabilidad y pity actual, como el «Detalles» de un gacha. */
export function DropRates() {
  const { t } = useTranslation();
  const pity = useGame((s) => s.state.player.pity);
  const anyDroppable = useGame((s) => [...s.state.items.values()].some((i) => i.droppable));
  const { legendary, epic } = PITY_RULES;

  return (
    <div className="rates">
      <div className="rates-tables">
        {(Object.keys(DROP_TABLES) as DropTableId[]).map((id) => {
          const table = DROP_TABLES[id];
          return (
            <section key={id} className={`rates-table is-${id}`}>
              <h3 className="sec-h">
                <span className="gem" />
                <span className="tag">{id === "elite" ? "Elite" : "Standard"}</span>
                <span className="sec-sub">{t(`items.rates.${id}`)}</span>
                <span className="sec-line" />
              </h3>
              <p className="muted rates-rolls">{t("items.rates.rolls", { count: table.rolls })}</p>
              <ul>
                {[...RARITIES].reverse().map((r) => (
                  <li key={r} style={{ "--rc": RARITY_META[r].color } as React.CSSProperties}>
                    <span className="gem" />
                    <span className="rates-name">{t(`items.rarity.${r}`)}</span>
                    <span className="rates-stars">{"★".repeat(RARITY_META[r].stars)}</span>
                    <span className="rates-bar">
                      <i style={{ width: `${Math.max(1.5, table.weights[r])}%` }} />
                    </span>
                    <b className="num">{pct(table.weights[r] / 100)}</b>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <section className="rates-pity">
        <h3 className="sec-h">
          <span className="gem" />
          <span className="tag">Pity</span>
          <span className="sec-sub">{t("items.rates.pity")}</span>
          <span className="sec-line" />
        </h3>
        <PityBar
          rarity="legendary"
          label={t("items.rates.pityLegendary", { n: legendary.hard - pity.sinceLegendary })}
          value={pity.sinceLegendary}
          max={legendary.hard}
          soft={legendary.soft - 1}
        />
        <PityBar
          rarity="epic"
          label={t("items.rates.pityEpic", { n: epic.hard - pity.sinceEpic })}
          value={pity.sinceEpic}
          max={epic.hard}
        />
        <p className="rates-next">
          {t("items.rates.nextChance", {
            standard: pct(legendaryChance(DROP_TABLES.standard, pity)),
            elite: pct(legendaryChance(DROP_TABLES.elite, pity)),
          })}
        </p>
        <p className="muted rates-note">
          {t("items.rates.softPity", { soft: legendary.soft, step: legendary.step, hard: legendary.hard, epic: epic.hard })}
        </p>
        <p className="muted rates-note">{t("items.rates.fallback")}</p>
        {!anyDroppable && <p className="rates-warn">{t("items.rates.empty")}</p>}
      </section>
    </div>
  );
}

function PityBar({ rarity, label, value, max, soft }: { rarity: "legendary" | "epic"; label: string; value: number; max: number; soft?: number }) {
  return (
    <div className="pity" style={{ "--rc": RARITY_META[rarity].color } as React.CSSProperties}>
      <span className="pity-lbl">{label}</span>
      <span className="pity-track">
        <i style={{ width: `${(value / max) * 100}%` }} />
        {soft !== undefined && <span className="pity-soft" style={{ left: `${(soft / max) * 100}%` }} />}
      </span>
      <span className="num pity-val">
        {value}
        <small> / {max}</small>
      </span>
    </div>
  );
}

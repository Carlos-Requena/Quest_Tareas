import { useTranslation } from "react-i18next";
import type { Category, QuestState } from "../../../domain/types";
import { useGame } from "../../../store/game";
import { sfx } from "../../../lib/sfx";
import { DROP_TABLES, RARITIES, RARITY_META, dropTableFor, sortItems } from "../model";
import { ItemArt, rarityStyle } from "./ItemTile";

/** Recompensas de objeto en el detalle de la quest: el garantizado y el botín aleatorio. */
export function QuestLoot({ quest }: { quest: QuestState }) {
  const { t } = useTranslation();
  const item = useGame((s) => (quest.reward.itemId ? s.state.items.get(quest.reward.itemId) : undefined));
  const setCollection = useGame((s) => s.setCollection);
  const tableId = dropTableFor(quest.category);
  const rolls = DROP_TABLES[tableId].rolls;

  return (
    <>
      {item && (
        <span className="reward reward-item" style={rarityStyle(item)} title={t(`items.rarity.${item.rarity}`)}>
          <span className="reward-art">
            <ItemArt item={item} locked />
          </span>
          <span className="reward-item-name">{item.name}</span>
          <small className="muted">×1</small>
        </span>
      )}
      <button
        className={`reward reward-loot is-${tableId}`}
        title={t("items.tabs.rates")}
        onClick={() => {
          sfx.move();
          setCollection("rates");
        }}
      >
        <span className="reward-ico item">◈</span>
        <span>{t("items.quest.loot")}</span>
        <small className="muted">
          {tableId === "elite" ? t("items.quest.lootElite", { count: rolls }) : t("items.quest.lootStandard", { count: rolls })}
        </small>
      </button>
    </>
  );
}

/** Selector del objeto garantizado en el formulario de quest, agrupado por rareza. */
export function GuaranteedItemSelect({ value, onChange }: { value: string; onChange(id: string): void }) {
  const { t } = useTranslation();
  const items = useGame((s) => s.state.items);
  const sorted = sortItems(items.values());
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{t("items.quest.none")}</option>
      {[...RARITIES].reverse().map((r) => {
        const group = sorted.filter((i) => i.rarity === r);
        if (!group.length) return null;
        return (
          <optgroup key={r} label={`${"★".repeat(RARITY_META[r].stars)} ${t(`items.rarity.${r}`)}`}>
            {group.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}

/** Línea informativa del botín según la categoría elegida en el formulario. */
export function LootHint({ category }: { category: Category }) {
  const { t } = useTranslation();
  const tableId = dropTableFor(category);
  const rolls = DROP_TABLES[tableId].rolls;
  return (
    <p className={`loot-hint is-${tableId}`}>
      <span className="reward-ico item">◈</span>
      {t("items.quest.loot")}:{" "}
      {tableId === "elite" ? t("items.quest.lootElite", { count: rolls }) : t("items.quest.lootStandard", { count: rolls })}
    </p>
  );
}

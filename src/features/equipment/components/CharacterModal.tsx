import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { sfx } from "../../../lib/sfx";
import { AttributesPanel } from "../../attributes";
import { ARMOR_SLOTS, DECOR_SLOTS, sortGear, starsOf, type ArmorSlot, type GearDef, type GearSlot } from "../../merchant/model";
import { GearArt, gearStyle } from "../../merchant/components/GearArt";
import { SlotGlyph } from "../../merchant/components/SlotGlyph";
import { openMerchant } from "../../merchant/ui";
import { equipGear, unequipSlot } from "../actions";
import { prestige, wornIn } from "../model";
import { useCharacterUi } from "../ui";
import { Doll } from "./Doll";
import { gearDescription, gearName } from "../../armory/labels";
import "../equipment.css";

const LEFT: ArmorSlot[] = ["head", "body", "hands", "feet"];
const RIGHT: ArmorSlot[] = ["weapon", "shield", "cape", "amulet"];
/** Orden del teclado: columna izquierda, derecha y la decoración. */
const ORDER: GearSlot[] = [...LEFT, ...RIGHT, ...DECOR_SLOTS];

/** Ficha del personaje: el muñeco con su equipo, la decoración del menú y los atributos. */
export function CharacterModal() {
  const open = useCharacterUi((s) => s.open);
  return <AnimatePresence>{open && <Modal />}</AnimatePresence>;
}

function Modal() {
  const { t } = useTranslation();
  const slot = useCharacterUi((s) => s.slot);
  const pick = useCharacterUi((s) => s.pick);
  const gear = useGame((s) => s.state.gear);
  const player = useGame((s) => s.state.player);
  const [hover, setHover] = useState<GearSlot>();

  const worn = useMemo(() => {
    const out: Partial<Record<GearSlot, GearDef>> = {};
    for (const s of [...ARMOR_SLOTS, ...DECOR_SLOTS]) {
      const g = wornIn(player.equipped, gear, s);
      if (g) out[s] = g;
    }
    return out;
  }, [player.equipped, gear]);
  const stars = prestige(player.equipped, gear);

  const close = () => useCharacterUi.getState().setOpen(false);
  const choose = (s?: GearSlot) => {
    sfx.move();
    pick(s === slot ? undefined : s);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) return;
      if (e.key === "Escape") {
        e.preventDefault();
        if (slot) pick(undefined);
        else close();
        return;
      }
      const i = slot ? ORDER.indexOf(slot) : -1;
      switch (e.key) {
        case "p":
        case "P":
          close();
          break;
        case "ArrowDown":
          choose(ORDER[(i + 1) % ORDER.length]);
          break;
        case "ArrowUp":
          choose(ORDER[(i - 1 + ORDER.length) % ORDER.length]);
          break;
        case "ArrowRight":
        case "ArrowLeft": {
          // Salta entre las dos columnas del muñeco a la misma altura.
          const s = slot ?? "head";
          const row = Math.max(LEFT.indexOf(s as ArmorSlot), RIGHT.indexOf(s as ArmorSlot), 0);
          choose(LEFT.includes(s as ArmorSlot) ? RIGHT[row] : LEFT[row]);
          break;
        }
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const lit = (hover ?? slot) as ArmorSlot | undefined;

  return (
    <motion.div
      className="modal-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <motion.div
        className="modal chr"
        style={{ "--cat": "var(--gold)" } as CSSProperties}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
      >
        <header className="modal-h chr-h">
          <span className="gem" />
          <span className="tag">Character</span>
          <span className="sec-sub">{t("equipment.open")}</span>
          <span className="chr-id">
            <span>{t("header.rank")}</span>
            <b className="num rank">{player.rank}</b>
            <span>{t("header.level")}</span>
            <b className="num">{player.level}</b>
            <span className="chr-prestige" title={t("equipment.prestigeTitle")}>
              {t("equipment.prestige")} <b className="num">★ {stars}</b>
            </span>
          </span>
          <button className="icon-btn chr-x" onClick={close} title={t("equipment.close")}>
            ✕
          </button>
        </header>

        <div className="chr-body">
          <section className="chr-left">
            <div className="chr-rig">
              <div className="chr-col">
                {LEFT.map((s) => (
                  <SlotFrame key={s} slot={s} gear={worn[s]} on={slot === s} onPick={() => choose(s)} onHover={setHover} />
                ))}
              </div>
              <div className="chr-doll">
                <Doll worn={worn} highlight={lit && ARMOR_SLOTS.includes(lit) ? lit : undefined} />
              </div>
              <div className="chr-col">
                {RIGHT.map((s) => (
                  <SlotFrame key={s} slot={s} gear={worn[s]} on={slot === s} onPick={() => choose(s)} onHover={setHover} right />
                ))}
              </div>
            </div>
            <h4 className="chr-decor-h">
              <span className="gem" />
              {t("equipment.decor")}
              <span className="sec-line" />
            </h4>
            <div className="chr-decor">
              {DECOR_SLOTS.map((s) => (
                <SlotFrame key={s} slot={s} gear={worn[s]} on={slot === s} onPick={() => choose(s)} onHover={setHover} wide />
              ))}
            </div>
          </section>

          <section className="chr-right">{slot ? <Wardrobe slot={slot} onBack={() => choose(undefined)} /> : <AttributesPanel />}</section>
        </div>

        <footer className="modal-f">
          <span className="muted hint">
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            <kbd>←</kbd>
            <kbd>→</kbd> {t("equipment.keys.slots")} · <kbd>Esc</kbd> {slot ? t("equipment.keys.back") : t("equipment.keys.close")}
          </span>
        </footer>
      </motion.div>
    </motion.div>
  );
}

interface SlotProps {
  slot: GearSlot;
  gear?: GearDef;
  on: boolean;
  right?: boolean;
  wide?: boolean;
  onPick(): void;
  onHover(s?: GearSlot): void;
}

/** Ranura del muñeco: la pieza puesta (o el hueco con su glifo) y su nombre. */
function SlotFrame({ slot, gear, on, right, wide, onPick, onHover }: SlotProps) {
  const { t } = useTranslation();
  return (
    <button
      className={`cslot ${on ? "is-on" : ""} ${gear ? "is-full" : ""} ${right ? "is-right" : ""} ${wide ? "is-wide" : ""}`}
      style={gear ? gearStyle(gear) : undefined}
      onClick={onPick}
      onMouseEnter={() => onHover(slot)}
      onMouseLeave={() => onHover(undefined)}
      title={gear ? gearName(gear, t) : t(`merchant.slot.${slot}`)}
    >
      <span className="cslot-frame">
        {gear ? <GearArt gear={gear} stars={false} /> : <SlotGlyph slot={slot} className="cslot-glyph" />}
      </span>
      <span className="cslot-txt">
        <span className="cslot-lbl">{t(`merchant.slot.${slot}`)}</span>
        <span className="cslot-name">{gear ? gearName(gear, t) : t("equipment.empty")}</span>
        {gear && <span className="cslot-stars">{"★".repeat(starsOf(gear))}</span>}
      </span>
    </button>
  );
}

/** Armario de una ranura: lo que tienes para ella, para ponértelo o quitártelo. */
function Wardrobe({ slot, onBack }: { slot: GearSlot; onBack(): void }) {
  const { t } = useTranslation();
  const gear = useGame((s) => s.state.gear);
  const player = useGame((s) => s.state.player);
  const mine = useMemo(() => sortGear([...gear.values()].filter((g) => g.slot === slot && player.owned[g.id])), [gear, player.owned, slot]);
  const decor = (DECOR_SLOTS as readonly string[]).includes(slot);

  return (
    <div className="wardrobe">
      <h3 className="sec-h">
        <span className="gem" />
        <span className="tag">Wardrobe</span>
        <span className="sec-sub">
          {t("equipment.wardrobe.title")} · {t(`merchant.slot.${slot}`)}
        </span>
        <span className="sec-line" />
      </h3>

      {mine.length === 0 ? (
        <div className="wardrobe-empty">
          <SlotGlyph slot={slot} className="wardrobe-glyph" />
          <p>{t("equipment.wardrobe.none")}</p>
          <p className="muted">{t("equipment.wardrobe.hint")}</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              useCharacterUi.getState().setOpen(false);
              openMerchant("showcase");
            }}
          >
            <span className="btn-key">C</span>
            {t("equipment.wardrobe.goShop")}
          </button>
        </div>
      ) : (
        <ul className="wardrobe-list">
          {mine.map((g) => {
            const worn = player.equipped[slot] === g.id;
            return (
              <li key={g.id} className={`wrow ${worn ? "is-worn" : ""}`} style={gearStyle(g)}>
                <GearArt gear={g} className="wrow-art" />
                <span className="wrow-main">
                  <span className="wrow-name">
                    {gearName(g, t)}
                    {worn && <span className="wrow-worn">{t("equipment.wardrobe.worn")}</span>}
                  </span>
                  {g.description && <span className="wrow-desc muted">{gearDescription(g, t)}</span>}
                </span>
                {worn ? (
                  <button className="wrow-btn is-off" onClick={() => unequipSlot(slot)}>
                    {t("equipment.wardrobe.unequip")}
                  </button>
                ) : (
                  <button className="wrow-btn" onClick={() => equipGear(g.id)}>
                    {decor ? t("equipment.wardrobe.equipDecor") : t("equipment.wardrobe.equip")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <button className="add-cond wardrobe-back" onClick={onBack}>
        ← {t("equipment.wardrobe.back")}
      </button>
    </div>
  );
}

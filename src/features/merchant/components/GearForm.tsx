import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import i18n, { num } from "../../../i18n";
import { RARITIES, RARITY_META } from "../../items/model";
import { createGear, draftOfGear, emptyGearDraft, isValidGearDraft, updateGear, type GearDraft } from "../actions";
import { prepareGearImages } from "../image";
import { ARMOR_SLOTS, DECOR_SLOTS, GEAR_LIMITS, needsArt, priceOf, rankRequired, type GearDef, type GearSlot } from "../model";
import { GearArt, gearStyle } from "./GearArt";

/**
 * Formulario para añadir o editar mercancía: nombre, tipo, rareza, imagen y descripción.
 * El precio no se elige: lo pone Hu Tao según la rareza, y aquí solo se avisa.
 */
export function GearForm({ gear, slot, onDone }: { gear?: GearDef; slot?: GearSlot; onDone(id?: string): void }) {
  const { t } = useTranslation();
  const say = useGame((s) => s.say);
  const [d, setD] = useState<GearDraft>(() => (gear ? draftOfGear(gear) : emptyGearDraft(slot)));
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<GearDraft>) => setD((cur) => ({ ...cur, ...patch }));
  const valid = isValidGearDraft(d);

  useEffect(() => nameRef.current?.focus(), []);

  const pick = async (file?: File) => {
    if (!file) return;
    try {
      const { image, art } = await prepareGearImages(file);
      set({ image, artBlob: art, art: undefined });
    } catch {
      say(() => i18n.t("merchant.form.imageError"));
    }
  };

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      if (gear) {
        await updateGear(gear.id, d);
        onDone(gear.id);
      } else {
        onDone(await createGear(d));
      }
    } finally {
      setBusy(false);
    }
  };

  const preview = { ...d, name: d.name || t("merchant.form.namePh") };

  return (
    <form
      className="gform"
      style={gearStyle(d)}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
      }}
    >
      <h3 className="sec-h">
        <span className="gem" />
        <span className="tag">{gear ? "Edit" : "New Gear"}</span>
        <span className="sec-sub">{gear ? t("merchant.form.editTitle") : t("merchant.form.newTitle")}</span>
        <span className="sec-line" />
      </h3>

      <div className="gform-top">
        <div
          className="gform-art"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files[0]);
          }}
        >
          <GearArt gear={preview} />
        </div>
        <div className="gform-fields">
          <label className="field">
            <span className="lbl">{t("merchant.form.name")}</span>
            <input
              ref={nameRef}
              value={d.name}
              maxLength={GEAR_LIMITS.name}
              placeholder={t("merchant.form.namePh")}
              onChange={(e) => set({ name: e.target.value })}
            />
          </label>
          <label className="field">
            <span className="lbl">{t("merchant.form.slot")}</span>
            <select value={d.slot} onChange={(e) => set({ slot: e.target.value as GearSlot })}>
              <optgroup label={t("merchant.group.armor")}>
                {ARMOR_SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {t(`merchant.slot.${s}`)}
                  </option>
                ))}
              </optgroup>
              <optgroup label={t("merchant.group.decor")}>
                {DECOR_SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {t(`merchant.slot.${s}`)}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
        </div>
      </div>

      <div className="field">
        <span className="lbl">{t("merchant.form.image")}</span>
        <div className="gform-img">
          <button type="button" className="gbtn-link" onClick={() => fileRef.current?.click()}>
            {d.image ? t("merchant.form.changeImage") : t("merchant.form.pickImage")}
          </button>
          {d.image && (
            <button type="button" className="gbtn-link is-danger" onClick={() => set({ image: undefined, art: undefined, artBlob: undefined })}>
              {t("merchant.form.removeImage")}
            </button>
          )}
          <span className="gform-hint muted">{needsArt(d.slot) ? t("merchant.form.backdropHint") : t("merchant.form.imageHint")}</span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif,image/avif"
          hidden
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      <div className="field">
        <span className="lbl">{t("merchant.form.rarity")}</span>
        <div className="gform-rarity" role="radiogroup">
          {RARITIES.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={d.rarity === r}
              className={`gform-r ${d.rarity === r ? "on" : ""}`}
              style={{ "--rc": RARITY_META[r].color } as React.CSSProperties}
              onClick={() => set({ rarity: r })}
              title={t(`items.rarity.${r}`)}
            >
              <span className="gform-r-stars">{"★".repeat(RARITY_META[r].stars)}</span>
              <span className="gform-r-lbl">{t(`items.rarity.${r}`)}</span>
            </button>
          ))}
        </div>
        <p className="gform-price">{t("merchant.form.price", { price: num(priceOf(d)), rank: rankRequired(d) })}</p>
      </div>

      <label className="field">
        <span className="lbl">{t("merchant.form.description")}</span>
        <textarea
          rows={3}
          value={d.description}
          maxLength={GEAR_LIMITS.description}
          placeholder={t("merchant.form.descriptionPh")}
          onChange={(e) => set({ description: e.target.value })}
        />
      </label>

      <div className="gform-actions">
        <button type="button" className="btn btn-ghost" onClick={() => onDone(gear?.id)}>
          {t("merchant.form.cancel")}
        </button>
        <button type="submit" className={`btn btn-primary ${valid && !busy ? "" : "is-disabled"}`} disabled={!valid || busy}>
          {gear ? t("merchant.form.save") : t("merchant.form.create")}
        </button>
      </div>
    </form>
  );
}

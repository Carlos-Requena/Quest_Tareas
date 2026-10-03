import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import i18n from "../../../i18n";
import { ITEM_KINDS, ITEM_LIMITS, KIND_GLYPH, RARITIES, RARITY_META, type ItemDef, type ItemKind } from "../model";
import { createItem, draftOf, emptyItemDraft, isValidItemDraft, updateItem, type ItemDraft } from "../actions";
import { fileToIcon } from "../image";
import { ItemArt } from "./ItemTile";

/** Formulario para crear o editar un objeto del almanaque. */
export function ItemForm({ item, onDone }: { item?: ItemDef; onDone(id?: string): void }) {
  const { t } = useTranslation();
  const say = useGame((s) => s.say);
  const [d, setD] = useState<ItemDraft>(() => (item ? draftOf(item) : emptyItemDraft()));
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<ItemDraft>) => setD((cur) => ({ ...cur, ...patch }));
  const valid = isValidItemDraft(d);

  useEffect(() => nameRef.current?.focus(), []);

  const pick = async (file?: File) => {
    if (!file) return;
    try {
      set({ image: await fileToIcon(file) });
    } catch {
      say(() => i18n.t("items.form.imageError"));
    }
  };

  const submit = async () => {
    if (!valid) return;
    if (item) {
      await updateItem(item.id, d);
      onDone(item.id);
    } else {
      onDone(await createItem(d));
    }
  };

  // Vista previa con los datos del borrador.
  const preview: ItemDef = { id: "preview", createdAt: 0, ...d, name: d.name || t("items.form.namePh") };

  return (
    <form
      className="iform"
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
        <span className="tag">{item ? "Edit" : "New Item"}</span>
        <span className="sec-sub">{item ? t("items.form.editTitle") : t("items.form.newTitle")}</span>
        <span className="sec-line" />
      </h3>

      <div className="iform-top">
        <div
          className="iform-art"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files[0]);
          }}
        >
          <ItemArt item={preview} />
        </div>
        <div className="iform-img">
          <span className="lbl">{t("items.form.image")}</span>
          <div className="iform-img-btns">
            <button type="button" className="add-cond" onClick={() => fileRef.current?.click()}>
              {d.image ? t("items.form.changeImage") : t("items.form.pickImage")}
            </button>
            {d.image && (
              <button type="button" className="add-cond is-danger" onClick={() => set({ image: undefined })}>
                {t("items.form.removeImage")}
              </button>
            )}
          </div>
          <span className="iform-hint muted">{t("items.form.imageHint")}</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            hidden
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <label className="field">
        <span className="lbl">{t("items.form.name")}</span>
        <input
          ref={nameRef}
          value={d.name}
          maxLength={ITEM_LIMITS.name}
          placeholder={t("items.form.namePh")}
          onChange={(e) => set({ name: e.target.value })}
        />
      </label>

      <div className="field">
        <span className="lbl">{t("items.form.rarity")}</span>
        <div className="iform-rarity">
          {RARITIES.map((r) => (
            <button
              type="button"
              key={r}
              className={`seg-btn ${d.rarity === r ? "on" : ""}`}
              style={{ "--c": RARITY_META[r].color } as React.CSSProperties}
              onClick={() => set({ rarity: r })}
            >
              <span className="gem" />
              {t(`items.rarity.${r}`)}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span className="lbl">{t("items.form.kind")}</span>
        <select value={d.kind} onChange={(e) => set({ kind: e.target.value as ItemKind })}>
          {ITEM_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_GLYPH[k]} {t(`items.kinds.${k}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="lbl">{t("items.form.description")}</span>
        <textarea
          rows={3}
          value={d.description}
          maxLength={ITEM_LIMITS.description}
          placeholder={t("items.form.descriptionPh")}
          onChange={(e) => set({ description: e.target.value })}
        />
      </label>

      <label className="iform-check">
        <input type="checkbox" checked={d.droppable} onChange={(e) => set({ droppable: e.target.checked })} />
        <span>{t("items.form.droppable")}</span>
      </label>

      <div className="iform-f">
        <button type="button" className="btn btn-ghost" onClick={() => onDone(item?.id)}>
          {t("items.form.cancel")}
        </button>
        <button type="submit" className={`btn btn-primary ${valid ? "" : "is-disabled"}`} disabled={!valid}>
          {item ? t("items.form.save") : t("items.form.create")}
        </button>
      </div>
    </form>
  );
}

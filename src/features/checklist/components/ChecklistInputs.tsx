import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { uid } from "../../../lib/id";
import { CHECKLIST_LIMITS, type ChecklistItem } from "../model";
import "../checklist.css";

/** Casillas de una lista en el formulario de la quest: añadir, escribir y quitar. Enter añade otra. */
export function ChecklistInputs({ items, onChange }: { items: ChecklistItem[]; onChange(items: ChecklistItem[]): void }) {
  const { t } = useTranslation();
  const box = useRef<HTMLDivElement>(null);
  const focusLast = () =>
    requestAnimationFrame(() => {
      const all = box.current?.querySelectorAll<HTMLInputElement>(".clist-in input");
      all?.[all.length - 1]?.focus();
    });
  const add = () => {
    if (items.length >= CHECKLIST_LIMITS.items) return;
    onChange([...items, { id: uid(), text: "" }]);
    focusLast();
  };

  return (
    <div className="clist-edit" ref={box}>
      {items.map((it, i) => (
        <div key={it.id} className="clist-in">
          <span className="clist-box" aria-hidden />
          <input
            value={it.text}
            maxLength={CHECKLIST_LIMITS.text}
            placeholder={t("checklist.itemPh", { n: i + 1 })}
            onChange={(e) => onChange(items.map((x) => (x.id === it.id ? { ...x, text: e.target.value } : x)))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                add();
              }
            }}
          />
          <button
            type="button"
            className="icon-btn"
            disabled={items.length === 1}
            title={t("checklist.removeItem")}
            onClick={() => onChange(items.filter((x) => x.id !== it.id))}
          >
            ✕
          </button>
        </div>
      ))}
      <div className="clist-foot">
        <button type="button" className="add-cond" disabled={items.length >= CHECKLIST_LIMITS.items} onClick={add}>
          {t("checklist.addItem")}
        </button>
        <span className="muted clist-hint">{t("checklist.hint")}</span>
      </div>
    </div>
  );
}

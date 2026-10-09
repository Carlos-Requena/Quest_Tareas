import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { uid } from "../../../lib/id";
import { sfx } from "../../../lib/sfx";
import { CONTACT_KINDS, CONTACT_LIMITS, contactValid, type ContactKind, type ContactRef } from "../model";
import { ContactIcon } from "./ContactIcon";
import "../contacts.css";

/** Cómo se escribe cada dato: teclado de teléfono, de correo o de enlace (sin la validación del navegador). */
const INPUT: Record<ContactKind, { type: string; inputMode: React.HTMLAttributes<HTMLInputElement>["inputMode"] }> = {
  phone: { type: "tel", inputMode: "tel" },
  whatsapp: { type: "tel", inputMode: "tel" },
  email: { type: "text", inputMode: "email" },
  link: { type: "text", inputMode: "url" },
  address: { type: "text", inputMode: "text" },
};

/**
 * Contactos en el formulario de una quest o un encargo: un desplegable para elegir
 * qué añadir (teléfono, correo, WhatsApp, enlace o dirección) y una fila por contacto.
 */
export function ContactsField({ value, onChange }: { value: ContactRef[]; onChange(v: ContactRef[]): void }) {
  const { t } = useTranslation();
  const list = useRef<HTMLDivElement>(null);
  const added = useRef(false);
  const full = value.length >= CONTACT_LIMITS.count;

  // Al añadir uno, el cursor va a su dato.
  useEffect(() => {
    if (!added.current) return;
    added.current = false;
    list.current?.querySelector<HTMLInputElement>(".ct-edit:last-child .ct-value")?.focus();
  }, [value.length]);

  const set = (id: string, patch: Partial<ContactRef>) => onChange(value.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  return (
    <div className="field ct-field">
      <span className="lbl">
        {t("contacts.label")} <small className="num">{value.length} / {CONTACT_LIMITS.count}</small>
      </span>
      <div className="ct-edits" ref={list}>
        <AnimatePresence initial={false}>
          {value.map((c) => {
            const wrong = c.value.trim() !== "" && !contactValid(c.kind, c.value);
            return (
              <motion.div
                key={c.id}
                className={`ct-edit ${wrong ? "is-wrong" : ""}`}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <span className="ct-kind" title={t(`contacts.kinds.${c.kind}`)}>
                  <ContactIcon kind={c.kind} />
                  <span>{t(`contacts.kinds.${c.kind}`)}</span>
                </span>
                <input enterKeyHint="done"
                  className="ct-name"
                  value={c.name}
                  maxLength={CONTACT_LIMITS.name}
                  placeholder={t("contacts.namePh")}
                  onChange={(e) => set(c.id, { name: e.target.value })}
                />
                <input enterKeyHint="done"
                  className="ct-value"
                  {...INPUT[c.kind]}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={c.value}
                  maxLength={CONTACT_LIMITS.value}
                  placeholder={t(`contacts.valuePh.${c.kind}`)}
                  onChange={(e) => set(c.id, { value: e.target.value })}
                />
                <button
                  type="button"
                  className="icon-btn"
                  title={t("contacts.remove")}
                  onClick={() => {
                    sfx.paperRip(0.3);
                    onChange(value.filter((x) => x.id !== c.id));
                  }}
                >
                  ✕
                </button>
                {wrong && <small className="ct-wrong">{t(`contacts.invalid.${c.kind}`)}</small>}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <select
        className="ct-add"
        value=""
        disabled={full}
        aria-label={t("contacts.add")}
        onChange={(e) => {
          const kind = e.target.value as ContactKind;
          if (!CONTACT_KINDS.includes(kind)) return;
          sfx.move();
          added.current = true;
          onChange([...value, { id: uid(), kind, name: "", value: "" }]);
        }}
      >
        <option value="" disabled>
          {t("contacts.add")}
        </option>
        {CONTACT_KINDS.map((k) => (
          <option key={k} value={k}>
            {t(`contacts.kinds.${k}`)}
          </option>
        ))}
      </select>
      <p className="tf-hint muted">{t("contacts.hint")}</p>
    </div>
  );
}

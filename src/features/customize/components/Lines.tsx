import { useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { sfx } from "../../../lib/sfx";
import { VOICE_LIMITS } from "../../menu/model";
import { EditIcon, TrashIcon } from "./CustomizeIcons";

export interface LineItem {
  id: string;
  text: string;
}

interface Props {
  items: LineItem[];
  /** Icono de cada fila (la parte del día, la situación) y su rótulo pequeño. */
  icon: ReactNode;
  badge: string;
  /** Las de serie: se ven, en cursiva, mientras no haya ninguna propia. */
  defaults: string[];
  placeholder: string;
  /** Línea de ayuda de debajo. */
  hint: string;
  onAdd(text: string): Promise<boolean>;
  onUpdate(id: string, text: string): Promise<boolean>;
  onRemove(id: string): void;
}

/**
 * Frases en filas, como las misiones de un gacha: las propias (editar en el sitio, quitar con
 * dos toques) o, sin ninguna, las de serie; y el campo para añadir otra. La usan lo que dice
 * un personaje en el menú y en «Mi día».
 */
export function LineList({ items, icon, badge, defaults, placeholder, hint, onAdd, onUpdate, onRemove }: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (await onAdd(draft)) setDraft("");
    input.current?.focus();
  };
  const onDraftKey = (e: KeyboardEvent<HTMLInputElement>) => {
    // Escape con texto lo borra; sin texto, vuelve a la rejilla (lo hace la ventana).
    if (e.key === "Escape" && draft) {
      e.preventDefault();
      e.stopPropagation();
      setDraft("");
    }
  };

  return (
    <>
      <div className="cz-lines">
        <AnimatePresence initial={false}>
          {items.length === 0
            ? defaults.map((text, i) => (
                <motion.div key={`default-${i}`} className="cz-line is-default" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <span className="cz-line-ico">
                    {icon}
                    <small>{badge}</small>
                  </span>
                  <span className="cz-line-body">
                    <small className="cz-line-lbl">{t("customize.voice.default")}</small>
                    <span className="cz-line-text">{text}</span>
                  </span>
                  <span className="cz-line-act" />
                </motion.div>
              ))
            : items.map((l, i) => <LineRow key={l.id} line={l} n={i + 1} icon={icon} badge={badge} onUpdate={onUpdate} onRemove={onRemove} />)}
        </AnimatePresence>
      </div>

      <form className="cz-line is-new" onSubmit={add}>
        <span className="cz-line-ico" aria-hidden>
          <span className="cz-plus" />
        </span>
        <span className="cz-line-body">
          <input ref={input} value={draft} maxLength={VOICE_LIMITS.text} onChange={(e) => setDraft(e.target.value)} onKeyDown={onDraftKey} placeholder={placeholder} aria-label={placeholder} />
        </span>
        <span className="cz-line-act">
          <button className="btn btn-primary cz-line-add" disabled={!draft.trim()}>
            {t("customize.voice.add")}
          </button>
        </span>
      </form>
      <p className="cz-voice-hint">{hint}</p>
    </>
  );
}

/** Una frase: su texto, editarla en el sitio (Enter guarda, Escape cancela) y quitarla con dos toques. */
function LineRow({ line, n, icon, badge, onUpdate, onRemove }: { line: LineItem; n: number; icon: ReactNode; badge: string; onUpdate: Props["onUpdate"]; onRemove: Props["onRemove"] }) {
  const { t } = useTranslation();
  const [edit, setEdit] = useState<string>();
  const [armed, setArmed] = useState(false);
  const save = async () => {
    if (edit === undefined) return;
    if (await onUpdate(line.id, edit)) setEdit(undefined);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setEdit(undefined);
    }
  };
  return (
    <motion.div className="cz-line" layout initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18, transition: { duration: 0.18 } }}>
      <span className="cz-line-ico">
        {icon}
        <small>{badge}</small>
      </span>
      <span className="cz-line-body">
        <small className="cz-line-lbl">{t("customize.voice.line", { n })}</small>
        {edit === undefined ? (
          <span className="cz-line-text">{line.text}</span>
        ) : (
          <input autoFocus value={edit} maxLength={VOICE_LIMITS.text} onChange={(e) => setEdit(e.target.value)} onKeyDown={onKey} aria-label={t("customize.voice.edit")} />
        )}
      </span>
      <span className="cz-line-act">
        {edit === undefined ? (
          <>
            <button className="cz-icon-btn" onClick={() => setEdit(line.text)} title={t("customize.voice.edit")} aria-label={t("customize.voice.edit")}>
              <EditIcon />
            </button>
            <button
              className={`cz-icon-btn is-danger ${armed ? "is-armed" : ""}`}
              onClick={() => {
                if (!armed) {
                  sfx.move();
                  setArmed(true);
                  setTimeout(() => setArmed(false), 3000);
                  return;
                }
                onRemove(line.id);
              }}
              title={armed ? t("customize.voice.confirm") : t("customize.voice.remove")}
              aria-label={armed ? t("customize.voice.confirm") : t("customize.voice.remove")}
            >
              <TrashIcon />
              {armed && <span>{t("customize.voice.confirm")}</span>}
            </button>
          </>
        ) : (
          <>
            <button className="cz-icon-btn is-ok" onClick={() => void save()} disabled={!edit.trim()} title={t("customize.voice.save")} aria-label={t("customize.voice.save")}>
              ✓
            </button>
            <button className="cz-icon-btn" onClick={() => setEdit(undefined)} title={t("customize.voice.cancel")} aria-label={t("customize.voice.cancel")}>
              ✕
            </button>
          </>
        )}
      </span>
    </motion.div>
  );
}

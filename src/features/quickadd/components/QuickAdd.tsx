import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useNow } from "../../../lib/time";
import { BACKDROP_EXIT } from "../../../lib/motion";
import { LANGS, currentLang } from "../../../i18n";
import { parseQuick, type QuickToken } from "../model";
import { quickCreate, quickDetails } from "../actions";
import { useQuickUi } from "../ui";
import { SheetGrip, useDragDismiss } from "../../mobile";
import "../quickadd.css";

/**
 * Una línea para apuntar una quest al vuelo: «Llamar al banco mañana #Hogar». Enter la
 * publica; Mayús+Enter (o ⤢) abre el formulario completo con lo escrito. Debajo, lo que
 * se ha entendido (fecha, área, élite…).
 */
export function QuickAddForm({ autoFocus, onDone }: { autoFocus?: boolean; onDone?(): void }) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const focusKey = useQuickUi((s) => s.focusKey);
  const now = useNow(60_000);
  const parsed = useMemo(() => parseQuick(text, now), [text, now]);

  useEffect(() => {
    if (focusKey || autoFocus) ref.current?.focus();
  }, [focusKey, autoFocus]);

  const submit = async () => {
    if (await quickCreate(text)) {
      setText("");
      onDone?.();
    }
  };

  return (
    <form
      className="qa"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="qa-line">
        <span className="qa-plus" aria-hidden>
          +
        </span>
        <input
          ref={ref}
          className="qa-input"
          value={text}
          enterKeyHint="send"
          aria-label={t("quickadd.label")}
          placeholder={t("quickadd.placeholder")}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            // Las teclas del tablón no deben dispararse mientras se escribe.
            e.stopPropagation();
            if (e.key === "Escape") {
              setText("");
              ref.current?.blur();
              onDone?.();
            } else if (e.key === "Enter" && e.shiftKey) {
              e.preventDefault();
              quickDetails(text);
              setText("");
            }
          }}
        />
        <button type="button" className="qa-more" title={t("quickadd.details")} aria-label={t("quickadd.details")} onClick={() => quickDetails(text)}>
          ⤢
        </button>
      </div>
      {text.trim() && (
        <div className="qa-chips">
          {parsed.title ? <span className="qa-chip is-title">{parsed.title}</span> : <span className="qa-chip is-missing">{t("quickadd.noTitle")}</span>}
          {parsed.tokens.map((tk, i) => (
            <Chip key={i} tk={tk} />
          ))}
          <span className="qa-keys muted">{t("quickadd.keys")}</span>
        </div>
      )}
    </form>
  );
}

function Chip({ tk }: { tk: QuickToken }) {
  const { t } = useTranslation();
  const locale = LANGS[currentLang()].locale;
  switch (tk.kind) {
    case "date":
      return <span className="qa-chip is-date">⌛ {new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(tk.dueAt)}</span>;
    case "area":
      return <span className="qa-chip">{t("quickadd.area", { value: tk.value })}</span>;
    case "client":
      return <span className="qa-chip">{t("quickadd.client", { value: tk.value })}</span>;
    case "elite":
      return <span className="qa-chip is-elite">ELITE</span>;
    case "target":
      return <span className="qa-chip">×{tk.value}</span>;
  }
}

/** En el teléfono, el rombo de crear abre esta hoja con la misma línea. */
export function QuickAddSheet() {
  const open = useQuickUi((s) => s.sheet);
  const { t } = useTranslation();
  const close = () => useQuickUi.getState().setSheet(false);
  // Se cierra también arrastrando el asa hacia abajo. El arrastre mueve la capa de fuera; Motion
  // anima la de dentro, y así no se pisan (features/mobile, drag.ts).
  const drag = useDragDismiss<HTMLDivElement>({ axis: "y", handle: true, onDismiss: close });
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="bg" className="qa-sheet-bg" onClick={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={BACKDROP_EXIT} />
          <div key="sheet" className="qa-sheet-pos" {...drag}>
            <motion.div
              className="qa-sheet"
              role="dialog"
              aria-label={t("quickadd.label")}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 40 }}
            >
              <SheetGrip />
              <QuickAddForm autoFocus onDone={close} />
              <p className="qa-help muted">{t("quickadd.help")}</p>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

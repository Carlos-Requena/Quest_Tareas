import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { sfx } from "../../../lib/sfx";
import { LANGS, currentLang } from "../../../i18n";
import { BACKDROP_EXIT, MODAL_EXIT } from "../../../lib/motion";
import { AGENDA_COLORS, AGENDA_LIMITS, isDateKey, keyMs, weekday, type AgendaColor } from "../model";
import { agendaDraftError, agendaDraftOf, deleteAgenda, emptyAgendaDraft, saveAgenda, skipAgendaDay, type AgendaDraft } from "../actions";
import { useAgendaUi, type AgendaForm as FormState } from "../ui";
import "../agenda.css";

/** Tecla modificadora del atajo de guardar: ⌘ en macOS, Ctrl en Windows. */
const MOD_KEY = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";

/** Lunes primero, como el calendario. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Color de cada bloque: los tokens del tema. */
export const AGENDA_COLOR_VAR: Record<AgendaColor, string> = {
  gold: "var(--gold)",
  elite: "var(--elite)",
  request: "var(--request)",
  repeat: "var(--repeat)",
  stamp: "var(--stamp)",
};

/** Ventana para añadir un bloque a la agenda o editarlo. */
export function AgendaFormModal() {
  const form = useAgendaUi((s) => s.form);
  return <AnimatePresence>{form && <Modal key={form.mode === "edit" ? form.id : `new-${form.date}`} form={form} />}</AnimatePresence>;
}

function Modal({ form }: { form: FormState }) {
  const { t } = useTranslation();
  const editing = useGame((s) => (form.mode === "edit" ? s.state.agenda.get(form.id) : undefined));
  const [d, setD] = useState<AgendaDraft>(() => (editing ? agendaDraftOf(editing) : emptyAgendaDraft(form.date, form.mode === "create" ? form.start : undefined)));
  const [confirm, setConfirm] = useState<"day" | "all">();
  const titleRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<AgendaDraft>) => setD((cur) => ({ ...cur, ...patch }));
  const error = agendaDraftError(d);
  const close = () => useAgendaUi.getState().setForm(undefined);
  const weekdays = t("agenda.weekdays", { returnObjects: true }) as string[];
  const names = t("agenda.weekdayNames", { returnObjects: true }) as string[];
  const dayLabel = new Intl.DateTimeFormat(LANGS[currentLang()].locale, { day: "numeric", month: "short" }).format(keyMs(form.date));

  useEffect(() => titleRef.current?.focus(), []);
  useEffect(() => {
    if (!confirm) return;
    const timer = setTimeout(() => setConfirm(undefined), 3000);
    return () => clearTimeout(timer);
  }, [confirm]);

  const submit = () => {
    if (error) return;
    saveAgenda(d, editing?.id);
  };

  const toggleDay = (day: number) => {
    sfx.move();
    const days = d.days.includes(day) ? d.days.filter((x) => x !== day) : [...d.days, day];
    set({ days, repeat: days.length === 7 ? "daily" : "days" });
  };

  return (
    <motion.div
      className="modal-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={BACKDROP_EXIT}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") close();
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
      }}
    >
      <motion.form
        className="modal ag-form"
        style={{ "--cat": AGENDA_COLOR_VAR[d.color] } as React.CSSProperties}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98, transition: MODAL_EXIT }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <header className="modal-h">
          <span className="gem" />
          <span className="tag">{editing ? "Amend Schedule" : "Schedule"}</span>
          <span className="sec-sub">{editing ? t("agenda.form.editTag") : t("agenda.form.newTag")}</span>
          <span className="sec-line" />
        </header>

        <div className="modal-body">
          <label className="field field-title">
            <span className="lbl">{t("agenda.form.title")}</span>
            <input ref={titleRef} value={d.title} maxLength={AGENDA_LIMITS.title} onChange={(e) => set({ title: e.target.value })} placeholder={t("agenda.form.titlePh")} />
          </label>

          <div className="row3">
            <label className="field">
              <span className="lbl">{t("agenda.form.date")}</span>
              <input
                type="date"
                value={d.date}
                onChange={(e) => {
                  const date = e.target.value;
                  // El día de la semana marcado sigue al día elegido, salvo que ya se eligieran otros a mano.
                  const picked = d.repeat === "days" && !(d.days.length === 1 && isDateKey(d.date) && d.days[0] === weekday(d.date));
                  set({ date, ...(isDateKey(date) && !picked && d.repeat !== "daily" ? { days: [weekday(date)] } : {}) });
                }}
              />
            </label>
            <label className="field">
              <span className="lbl">{t("agenda.form.start")}</span>
              <input type="time" value={d.start} onChange={(e) => set({ start: e.target.value })} />
            </label>
            <label className="field">
              <span className="lbl">{t("agenda.form.end")}</span>
              <input type="time" value={d.end === "24:00" ? "23:59" : d.end} onChange={(e) => set({ end: e.target.value })} />
            </label>
          </div>
          {error === "time" && <p className="tf-err">{t("agenda.form.endBeforeStart")}</p>}

          <div className="field">
            <span className="lbl">{t("agenda.form.repeat")}</span>
            <div className="seg ag-repeat">
              {(["none", "daily", "days"] as const).map((r) => (
                <button
                  type="button"
                  key={r}
                  className={`seg-btn ${d.repeat === r ? "on" : ""}`}
                  onClick={() => {
                    sfx.move();
                    set({ repeat: r, days: r === "daily" ? [0, 1, 2, 3, 4, 5, 6] : r === "days" && d.days.length === 7 ? [new Date(keyMs(d.date)).getDay()] : d.days });
                  }}
                >
                  {t(r === "none" ? "agenda.form.repeatNone" : r === "daily" ? "agenda.form.repeatDaily" : "agenda.form.repeatDays")}
                </button>
              ))}
            </div>
            {d.repeat !== "none" && (
              <div className="ag-repeat-more">
                {d.repeat === "days" && (
                  <div className="ag-days" role="group" aria-label={t("agenda.form.repeatDays")}>
                    {WEEK_ORDER.map((day) => (
                      <button type="button" key={day} className={`ag-day ${d.days.includes(day) ? "on" : ""}`} aria-pressed={d.days.includes(day)} title={names[day]} onClick={() => toggleDay(day)}>
                        {weekdays[day]}
                      </button>
                    ))}
                  </div>
                )}
                <label className="ag-until">
                  <span className="lbl">{t("agenda.form.until")}</span>
                  <input type="date" value={d.until} min={d.date} onChange={(e) => set({ until: e.target.value })} />
                  {!d.until && <small className="muted">{t("agenda.form.untilHint")}</small>}
                </label>
              </div>
            )}
          </div>

          <div className="field">
            <span className="lbl">{t("agenda.form.color")}</span>
            <div className="ag-colors">
              {AGENDA_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`ag-color ${d.color === c ? "on" : ""}`}
                  style={{ "--c": AGENDA_COLOR_VAR[c] } as React.CSSProperties}
                  title={t(`agenda.colors.${c}`)}
                  aria-label={t(`agenda.colors.${c}`)}
                  aria-pressed={d.color === c}
                  onClick={() => {
                    sfx.move();
                    set({ color: c });
                  }}
                />
              ))}
            </div>
          </div>

          <label className="field">
            <span className="lbl">{t("agenda.form.notes")}</span>
            <textarea rows={2} value={d.notes} maxLength={AGENDA_LIMITS.notes} onChange={(e) => set({ notes: e.target.value })} placeholder={t("agenda.form.notesPh")} />
          </label>
        </div>

        <footer className="modal-f">
          {editing ? (
            <span className="ag-delete">
              {editing.repeat && (
                <button
                  type="button"
                  className={`btn btn-ghost ${confirm === "day" ? "btn-danger" : ""}`}
                  onClick={() => (confirm === "day" ? skipAgendaDay(editing.id, form.date, dayLabel) : setConfirm("day"))}
                >
                  {confirm === "day" ? t("agenda.form.confirm") : t("agenda.form.deleteDay", { date: dayLabel })}
                </button>
              )}
              <button type="button" className={`btn btn-ghost ${confirm === "all" ? "btn-danger" : ""}`} onClick={() => (confirm === "all" ? deleteAgenda(editing.id) : setConfirm("all"))}>
                {confirm === "all" ? t("agenda.form.confirm") : editing.repeat ? t("agenda.form.deleteAll") : t("agenda.form.delete")}
              </button>
            </span>
          ) : (
            <span className="muted hint">
              <kbd>{MOD_KEY}</kbd>+<kbd>Enter</kbd> {t("modal.publish")} · <kbd>Esc</kbd> {t("modal.close")}
            </span>
          )}
          <button type="button" className="btn btn-ghost" onClick={close}>
            {t("agenda.form.cancel")}
          </button>
          <button type="submit" className={`btn btn-primary ${error ? "is-disabled" : ""}`} disabled={!!error}>
            {editing ? t("agenda.form.save") : t("agenda.form.create")}
          </button>
        </footer>
      </motion.form>
    </motion.div>
  );
}

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { sfx } from "../../../lib/sfx";
import { LANGS, currentLang } from "../../../i18n";
import { KIND_META, MAX_SKULLS, TEMPORAL_KINDS, TEMPORAL_LIMITS, type TemporalKind } from "../model";
import { ACCEPT, formatSize, prepareFile, type FileError, type PreparedFile } from "../files";
import { copyDraft, createTemporal, draftOf, draftReward, emptyDraft, isValidDraft, updateTemporal, type TemporalDraft } from "../actions";
import { RewardPreview } from "../../rewards/components/RewardPreview";
import { temporalBonusRate } from "../../rewards/model";
import { useTemporalUi } from "../ui";
import { Skull } from "./Skull";
import { ClipIcon } from "./Poster";
import { TemporalQuestsField } from "./TemporalQuestsField";
import { BACKDROP_EXIT, MODAL_EXIT } from "../../../lib/motion";
import { ContactsField } from "../../contacts";

/** Tecla modificadora del atajo de guardar: ⌘ en macOS, Ctrl en Windows. */
const MOD_KEY = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";

/** Ventana para clavar un encargo nuevo o editar uno pendiente. */
export function TemporalFormModal() {
  const form = useTemporalUi((s) => s.form);
  return (
    <AnimatePresence>
      {form && (
        <Modal
          key={form.mode === "edit" ? form.id : "new"}
          editId={form.mode === "edit" ? form.id : undefined}
          date={form.mode === "create" ? form.date : undefined}
          from={form.mode === "create" ? form.from : undefined}
        />
      )}
    </AnimatePresence>
  );
}

/** Convierte los archivos elegidos (o soltados) en adjuntos listos, con sus errores traducidos. */
export function useFilePicker(onReady: (files: PreparedFile[]) => void) {
  const { t } = useTranslation();
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const take = async (list: FileList | File[] | null) => {
    if (!list || !list.length) return;
    setBusy(true);
    const ok: PreparedFile[] = [];
    const errs: string[] = [];
    for (const f of Array.from(list)) {
      try {
        ok.push(await prepareFile(f));
      } catch (e) {
        const code = (typeof e === "string" ? e : "image") as FileError;
        errs.push(t(`temporal.form.errors.${code}`, { name: f.name, mb: TEMPORAL_LIMITS.fileMb }));
      }
    }
    setBusy(false);
    setErrors(errs);
    if (errs.length) sfx.cancel();
    if (ok.length) onReady(ok);
  };
  return { take, errors, setErrors, busy };
}

function Modal({ editId, date, from }: { editId?: string; date?: string; from?: string }) {
  const editing = useGame((s) => (editId ? s.state.temporals.get(editId) : undefined));
  const { t } = useTranslation();
  const [d, setD] = useState<TemporalDraft>(() => {
    const { temporals, quests } = useGame.getState().state;
    if (editing) return draftOf(editing, quests);
    // Copia de un encargo quemado (features/failure): lo mismo, con fecha nueva.
    const burned = from ? temporals.get(from) : undefined;
    return burned ? copyDraft(burned, quests) : emptyDraft(Date.now(), date);
  });
  const quests = useGame((s) => s.state.quests);
  const [hoverSkull, setHoverSkull] = useState<number>();
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<TemporalDraft>) => setD((cur) => ({ ...cur, ...patch }));
  const total = d.attachments.length + d.files.length;

  const picker = useFilePicker((files) => {
    setD((cur) => {
      const room = TEMPORAL_LIMITS.attachments - cur.attachments.length - cur.files.length;
      if (files.length > room) picker.setErrors([t("temporal.form.errors.tooMany", { n: TEMPORAL_LIMITS.attachments })]);
      const known = new Set(cur.files.map((f) => f.key));
      return { ...cur, files: [...cur.files, ...files.filter((f) => !known.has(f.key)).slice(0, Math.max(0, room))] };
    });
    sfx.pin();
  });

  useEffect(() => titleRef.current?.focus(), []);

  const close = () => useTemporalUi.getState().setForm(undefined);
  const valid = isValidDraft(d);

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    const ok = editId ? await updateTemporal(editId, d) : await createTemporal(d);
    if (!ok) setSaving(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Escape") close();
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
  };

  const pickSkulls = (n: number) => {
    sfx.skullStamp(n - 1);
    set({ difficulty: n });
  };

  const shown = hoverSkull ?? d.difficulty;
  const levels = t("temporal.difficulty.levels", { returnObjects: true }) as string[];
  const locale = LANGS[currentLang()].locale;

  return (
    <motion.div
      className="modal-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={BACKDROP_EXIT}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
      onKeyDown={onKey}
    >
      <motion.form
        className={`modal tf ${dragging ? "is-dragging" : ""}`}
        style={{ "--cat": "var(--skull)" } as React.CSSProperties}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98, transition: MODAL_EXIT }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          picker.take(e.dataTransfer.files);
        }}
      >
        <header className="modal-h">
          <span className="gem" />
          <span className="tag">{editId ? "Amend Posting" : "Timed Posting"}</span>
          <span className="sec-sub">{editId ? t("temporal.form.editTag") : t("temporal.form.newTag")}</span>
          <span className="sec-line" />
        </header>

        <div className="modal-body">
          <label className="field field-title">
            <span className="lbl">{t("temporal.form.title")}</span>
            <input enterKeyHint="done" ref={titleRef} value={d.title} maxLength={TEMPORAL_LIMITS.title} onChange={(e) => set({ title: e.target.value })} placeholder={t("temporal.form.titlePh")} />
          </label>

          <div className="field">
            <span className="lbl">{t("temporal.form.kind")}</span>
            <div className="seg tf-kinds">
              {TEMPORAL_KINDS.map((k: TemporalKind) => (
                <button
                  type="button"
                  key={k}
                  className={`seg-btn ${d.kind === k ? "on" : ""}`}
                  style={{ "--c": KIND_META[k].red ? "var(--skull)" : "var(--ink)" } as React.CSSProperties}
                  onClick={() => {
                    sfx.move();
                    set({ kind: k });
                  }}
                  title={KIND_META[k].tag}
                >
                  <span className="gem" />
                  {t(`temporal.kinds.${k}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="lbl">
              {t("temporal.difficulty.label")} · <b className="tf-level">{levels[shown - 1]}</b>
            </span>
            <div className="tf-skulls" onMouseLeave={() => setHoverSkull(undefined)}>
              {Array.from({ length: MAX_SKULLS }, (_, i) => (
                <button
                  type="button"
                  key={i}
                  className={`tf-skull ${i < shown ? "on" : ""}`}
                  aria-label={`${i + 1}`}
                  aria-pressed={i < d.difficulty}
                  onMouseEnter={() => setHoverSkull(i + 1)}
                  onClick={() => pickSkulls(i + 1)}
                >
                  <Skull />
                </button>
              ))}
            </div>
          </div>

          <div className="row3">
            <label className="field">
              <span className="lbl">{t("temporal.form.date")}</span>
              <input type="date" value={d.date} onChange={(e) => set({ date: e.target.value })} />
            </label>
            <div className="field">
              <span className="lbl">{t("temporal.form.time")}</span>
              <div className="tf-time">
                <input type="time" value={d.time} disabled={!d.time} onChange={(e) => set({ time: e.target.value })} />
                <label className="tf-check">
                  <input type="checkbox" checked={!d.time} onChange={(e) => set({ time: e.target.checked ? "" : "10:00" })} />
                  {t("temporal.form.allDay")}
                </label>
              </div>
            </div>
            <label className="field">
              <span className="lbl">{t("temporal.form.place")}</span>
              <input enterKeyHint="done" value={d.place} maxLength={TEMPORAL_LIMITS.place} onChange={(e) => set({ place: e.target.value })} placeholder={t("temporal.form.placePh")} />
            </label>
          </div>

          <label className="field">
            <span className="lbl">{t("temporal.form.notes")}</span>
            <textarea rows={3} value={d.notes} maxLength={TEMPORAL_LIMITS.notes} onChange={(e) => set({ notes: e.target.value })} placeholder={t("temporal.form.notesPh")} />
          </label>

          <ContactsField value={d.contacts} onChange={(contacts) => set({ contacts })} />

          <TemporalQuestsField d={d} set={set} editId={editId} />

          <div className="field">
            <span className="lbl">
              {t("temporal.form.attachments")} <small className="num">{total} / {TEMPORAL_LIMITS.attachments}</small>
            </span>
            <div className="tf-drop">
              <AnimatePresence initial={false}>
                {[...d.attachments.map((a) => ({ key: a.id, name: a.name, size: a.size, thumb: a.thumb, mime: a.mime, saved: true })), ...d.files.map((f) => ({ ...f, saved: false }))].map((f) => (
                  <motion.div
                    key={f.key}
                    className="tf-file"
                    layout
                    initial={{ opacity: 0, scale: 0.8, rotate: -6 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                  >
                    {f.thumb ? <img src={f.thumb} alt="" /> : <span className="tf-pdf">PDF</span>}
                    <span className="tf-file-name" title={f.name}>
                      {f.name}
                    </span>
                    <small className="muted">{formatSize(f.size, locale)}</small>
                    <button
                      type="button"
                      className="icon-btn"
                      title={t("temporal.form.remove")}
                      onClick={() => {
                        sfx.paperRip(0.3);
                        if (f.saved) set({ attachments: d.attachments.filter((a) => a.id !== f.key) });
                        else set({ files: d.files.filter((x) => x.key !== f.key) });
                      }}
                    >
                      ✕
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              <button type="button" className="add-cond tf-pick" disabled={total >= TEMPORAL_LIMITS.attachments || picker.busy} onClick={() => fileRef.current?.click()}>
                <ClipIcon /> {t("temporal.form.pick")}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT}
                multiple
                hidden
                onChange={(e) => {
                  picker.take(e.target.files);
                  e.target.value = "";
                }}
              />
              <p className="tf-hint muted">{t("temporal.form.attachHint", { mb: TEMPORAL_LIMITS.fileMb })}</p>
              {picker.errors.map((err) => (
                <p key={err} className="tf-err">
                  {err}
                </p>
              ))}
            </div>
          </div>

          <RewardPreview reward={draftReward(d, quests)} hint={t("rewards.temporal", { pct: Math.round(temporalBonusRate(d.difficulty) * 100) })} />

          {/* Solo al clavarlo: después se acepta o se aplaza desde el cartel. */}
          {!editId && (
            <div className="field tf-accept">
              <label className="tf-check">
                <input
                  type="checkbox"
                  checked={d.accept}
                  onChange={(e) => {
                    sfx.move();
                    set({ accept: e.target.checked });
                  }}
                />
                {t("temporal.form.accept")}
              </label>
              <p className="tf-hint muted">{t("temporal.form.acceptHint")}</p>
            </div>
          )}
        </div>

        <footer className="modal-f">
          <span className="muted hint">
            <kbd>{MOD_KEY}</kbd>+<kbd>Enter</kbd> {t("modal.publish")} · <kbd>Esc</kbd> {t("modal.close")}
          </span>
          <button type="button" className="btn btn-ghost" onClick={close}>
            {t("temporal.form.cancel")}
          </button>
          <button type="submit" className={`btn btn-primary ${valid && !saving ? "" : "is-disabled"}`} disabled={!valid || saving}>
            {editId ? t("temporal.form.save") : t("temporal.form.submit")}
          </button>
        </footer>
        <div className="tf-dropveil">
          <ClipIcon />
          {t("temporal.view.drop")}
        </div>
      </motion.form>
    </motion.div>
  );
}

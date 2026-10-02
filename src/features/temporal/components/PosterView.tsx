import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import gsap from "gsap";
import { useGame } from "../../../store/game";
import { sfx } from "../../../lib/sfx";
import { calm } from "../../../lib/fx";
import { useNow } from "../../../lib/time";
import { LANGS, currentLang, num } from "../../../i18n";
import { GoldIcon } from "../../../components/Header";
import { KIND_META, isPdf, type TemporalState } from "../model";
import { tornEdge, skullSpots } from "../look";
import { dueChip, longDate, longDue } from "../format";
import { formatSize } from "../files";
import { attachFiles, completeTemporal, deleteTemporal, detachAttachment } from "../actions";
import { useTemporalUi } from "../ui";
import { Skull } from "./Skull";
import { ClipIcon } from "./Poster";
import { useFilePicker } from "./TemporalForm";
import { ACCEPT } from "../files";

/** El cartel en grande: todos sus datos, sus adjuntos y las acciones (cumplir, editar, adjuntar, retirar). */
export function PosterView() {
  const viewing = useTemporalUi((s) => s.viewing);
  const t = useGame((s) => (viewing ? s.state.temporals.get(viewing.id) : undefined));
  if (!viewing || !t) return null;
  return <View key={t.id} t={t} />;
}

function View({ t }: { t: TemporalState }) {
  const { t: tr } = useTranslation();
  const now = useNow(30_000);
  const origin = useTemporalUi((s) => s.viewing?.origin);
  const root = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const meta = KIND_META[t.kind];
  const chip = dueChip(t, now);
  const pending = t.status === "pending";
  const clip = useMemo(() => tornEdge(`${t.id}:view`, 9, 34), [t.id]);
  const skulls = useMemo(() => skullSpots(`${t.id}:view`, t.difficulty, "landscape"), [t.id, t.difficulty]);
  const locale = LANGS[currentLang()].locale;
  const picker = useFilePicker((files) => attachFiles(t.id, files));

  // Se despliega desde el cartel del tablón: misma posición, tamaño e inclinación al empezar.
  useLayoutEffect(() => {
    const el = sheet.current;
    if (!el || !root.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".pv-veil", { opacity: 0 }, { opacity: 1, duration: 0.3 });
      if (origin && !calm()) {
        const r = el.getBoundingClientRect();
        gsap.fromTo(
          el,
          {
            x: origin.x + origin.width / 2 - (r.left + r.width / 2),
            y: origin.y + origin.height / 2 - (r.top + r.height / 2),
            scale: origin.width / r.width,
            rotation: origin.rotation,
          },
          { x: 0, y: 0, scale: 1, rotation: 0, duration: 0.55, ease: "power3.out" },
        );
      } else {
        gsap.fromTo(el, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.3 });
      }
      gsap.from(".pv-in", { opacity: 0, y: 10, stagger: 0.04, duration: 0.3, delay: 0.25 });
      gsap.from(".pv-sheet .skull", { scale: 0, rotation: -60, stagger: 0.06, duration: 0.35, ease: "back.out(2.4)", delay: 0.35 });
      gsap.from(".pv-actions", { opacity: 0, y: 16, duration: 0.3, delay: 0.3 });
    }, root);
    return () => ctx.revert();
  }, [origin]);

  /** Vuelve a su sitio en el tablón (si sigue ahí) y se cierra. */
  const close = () => {
    if (closing.current) return;
    closing.current = true;
    const el = sheet.current;
    const target = document.querySelector<HTMLElement>(`[data-tid="${t.id}"] .tp-paper`);
    const done = () => useTemporalUi.getState().closeView();
    if (!el || !target || calm()) {
      gsap.to(root.current, { opacity: 0, duration: 0.2, onComplete: done });
      return;
    }
    const r = el.getBoundingClientRect();
    const o = target.getBoundingClientRect();
    const rot = parseFloat(getComputedStyle(target.closest(".tp")!).getPropertyValue("--rot")) || 0;
    gsap.to(".pv-veil", { opacity: 0, duration: 0.35 });
    gsap.to(".pv-actions", { opacity: 0, duration: 0.15 });
    gsap.to(el, {
      x: o.left + o.width / 2 - (r.left + r.width / 2),
      y: o.top + o.height / 2 - (r.top + r.height / 2),
      scale: o.width / r.width,
      rotation: rot,
      opacity: 0.4,
      duration: 0.38,
      ease: "power2.in",
      onComplete: done,
    });
  };

  useEffect(() => {
    if (!confirmDelete) return;
    const timer = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmDelete]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // El visor de adjuntos y el formulario tienen sus propias teclas.
      const ui = useTemporalUi.getState();
      if (ui.viewer || ui.form) return;
      // Con el foco en un botón (Tab), Enter pulsa ese botón: no cumple el encargo por sorpresa.
      if (e.key === "Enter" && e.target instanceof HTMLButtonElement && root.current?.contains(e.target)) return;
      if (e.key === "Escape") close();
      else if (e.key === "Enter" && pending) completeTemporal(t.id);
      else if (e.key === "e" && pending) ui.setForm({ mode: "edit", id: t.id });
      else return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  return (
    <div
      className={`pv ${dragging ? "is-dragging" : ""}`}
      ref={root}
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
      <div className="pv-veil" onClick={close} />
      <div className="pv-wrap">
        <div className={`pv-sheet ${meta.red ? "is-red" : ""} is-${t.status}`} ref={sheet}>
          <div className="pv-paper" style={{ clipPath: clip }}>
            <div className="pv-frame">
              <div className="pv-head pv-in">
                <span className="pv-orn" />
                <span className="pv-kind">{tr(`temporal.kinds.${t.kind}`)}</span>
                <span className="pv-orn" />
              </div>
              <span className="pv-tag pv-in">{meta.tag}</span>
              <h2 className="pv-title pv-in">{t.title}</h2>

              <div className="pv-grid pv-in">
                <div>
                  <span className="pv-lbl">{tr("temporal.view.when")}</span>
                  <span className="pv-val">{longDue(t)}</span>
                  <span className={`tp-chip is-${chip.urgency} pv-chip`}>
                    {pending ? chip.label : tr("temporal.view.completedOn", { date: longDate(t.completedAt ?? now) })}
                  </span>
                </div>
                <div>
                  <span className="pv-lbl">{tr("temporal.view.place")}</span>
                  <span className="pv-val">{t.place || "—"}</span>
                </div>
              </div>

              {t.notes && (
                <div className="pv-notes pv-in">
                  <span className="pv-lbl">{tr("temporal.view.notes")}</span>
                  <p>{t.notes}</p>
                </div>
              )}

              <div className="pv-files pv-in">
                <span className="pv-lbl">
                  <ClipIcon /> {tr("temporal.view.attachments")}
                </span>
                {t.attachments.length === 0 ? (
                  <p className="pv-empty">{tr("temporal.view.noAttachments")}</p>
                ) : (
                  <div className="pv-file-list">
                    {t.attachments.map((a) => (
                      <div key={a.id} className={`pv-file ${isPdf(a) ? "is-pdf" : ""}`}>
                        <button
                          className="pv-file-open"
                          title={tr("temporal.view.open", { name: a.name })}
                          onClick={() => {
                            sfx.unfold();
                            useTemporalUi.getState().setViewer(a);
                          }}
                        >
                          {a.thumb ? <img src={a.thumb} alt="" draggable={false} /> : <span className="pv-pdf">PDF</span>}
                          <span className="pv-file-name">{a.name}</span>
                          <small>{formatSize(a.size, locale)}</small>
                        </button>
                        <button className="pv-file-x" title={tr("temporal.view.detach")} onClick={() => detachAttachment(t.id, a.id)}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {picker.errors.map((err) => (
                  <p key={err} className="tf-err">
                    {err}
                  </p>
                ))}
              </div>

              <div className="pv-reward pv-in">
                <span className="pv-lbl">{tr("temporal.view.reward")}</span>
                <span className="reward-ico xp">XP</span>
                <b className="num">{num((t.earned ?? t.reward).xp)}</b>
                <GoldIcon />
                <b className="num">{num((t.earned ?? t.reward).gold)}</b>
                <small>G</small>
              </div>
            </div>
            <span className="tp-clear pv-clear">Clear</span>
          </div>
          <div className="pv-skulls">
            {skulls.map((s, i) => (
              <Skull
                key={i}
                className={pending ? "" : "skull-gold"}
                style={{ left: `${s.x}%`, top: `${s.y}%`, transform: `translate(-50%, -50%) rotate(${s.rotate}deg) scale(${s.scale})` }}
              />
            ))}
          </div>
        </div>

        <div className="pv-actions">
          {pending && (
            <button className="btn btn-primary is-ready" onClick={() => completeTemporal(t.id)}>
              <span className="btn-key">↵</span>
              {tr("temporal.view.complete")}
            </button>
          )}
          {pending && (
            <button className="btn btn-ghost" onClick={() => useTemporalUi.getState().setForm({ mode: "edit", id: t.id })}>
              <span className="btn-key">E</span>
              {tr("temporal.view.edit")}
            </button>
          )}
          <button className="btn btn-ghost" disabled={picker.busy} onClick={() => fileRef.current?.click()}>
            <ClipIcon />
            {tr("temporal.view.attach")}
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
          <button
            className={`btn btn-ghost ${confirmDelete ? "btn-danger" : ""}`}
            onClick={() => (confirmDelete ? deleteTemporal(t.id) : setConfirmDelete(true))}
          >
            {confirmDelete ? tr("temporal.view.deleteConfirm") : tr("temporal.view.delete")}
          </button>
          <button className="btn btn-ghost pv-close" onClick={close}>
            <span className="btn-key">⎋</span>
            {tr("temporal.view.close")}
          </button>
        </div>
      </div>
      <div className="pv-dropveil">
        <ClipIcon />
        {tr("temporal.view.drop")}
      </div>
    </div>
  );
}

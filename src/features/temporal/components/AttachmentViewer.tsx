import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { isPdf, type AttachmentRef } from "../model";
import { loadAttachment } from "../actions";
import { useTemporalUi } from "../ui";

/** Visor de un adjunto: la imagen a pantalla completa o el PDF con el visor del propio WebView. */
export function AttachmentViewer() {
  const a = useTemporalUi((s) => s.viewer);
  return <AnimatePresence>{a && <Viewer key={a.id} a={a} />}</AnimatePresence>;
}

function Viewer({ a }: { a: AttachmentRef }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>();
  const [zoom, setZoom] = useState(false);
  const close = () => useTemporalUi.getState().setViewer(undefined);

  useEffect(() => {
    let alive = true;
    let made: string | undefined;
    loadAttachment(a)
      .then((blob) => {
        if (!alive) return;
        made = blob ? URL.createObjectURL(blob) : undefined;
        setUrl(made ?? null);
      })
      .catch(() => alive && setUrl(null));
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [a]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      close();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  return (
    <motion.div className="av" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <header className="av-bar">
        <span className="gem" />
        <span className="av-name">{a.name}</span>
        {url && (
          <a className="btn btn-ghost" href={url} download={a.name}>
            {t("temporal.viewer.download")}
          </a>
        )}
        <button className="btn btn-ghost" onClick={close}>
          <span className="btn-key">⎋</span>
          {t("temporal.viewer.close")}
        </button>
      </header>
      <motion.div
        className="av-body"
        initial={{ scale: 0.94, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        onMouseDown={(e) => e.target === e.currentTarget && close()}
      >
        {url === undefined && <p className="av-msg">{t("temporal.viewer.loading")}</p>}
        {url === null && <p className="av-msg">{t("temporal.viewer.missing")}</p>}
        {url && isPdf(a) && <iframe className="av-pdf" src={url} title={a.name} />}
        {url && !isPdf(a) && (
          <img className={`av-img ${zoom ? "is-zoom" : ""}`} src={url} alt={a.name} onClick={() => setZoom(!zoom)} draggable={false} />
        )}
      </motion.div>
    </motion.div>
  );
}

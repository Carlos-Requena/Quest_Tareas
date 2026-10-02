import { forwardRef, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { calm } from "../../../lib/fx";

const BASE = import.meta.env.BASE_URL;
/** Vídeo de Hu Tao en public/merchant/: MP4 (H.264) para WebKit y WebView2; WebM (VP9) para Chromium sin códecs propietarios. */
export const HUTAO_VIDEO = {
  mp4: `${BASE}merchant/hutao.mp4`,
  webm: `${BASE}merchant/hutao.webm`,
  poster: `${BASE}merchant/hutao.webp`,
};

interface Props {
  /** Lo que dice Hu Tao ahora. Al cambiar, se escribe letra a letra. */
  line: string;
  /** Capas encima del vídeo (el sello de «vendido»). */
  children?: ReactNode;
}

/**
 * Escenario del mercader: Hu Tao en bucle, en su escaparate, con su cuadro de diálogo
 * como en un JRPG. Si el vídeo no está, queda su cartel y el diálogo sigue.
 */
export const HuTaoStage = forwardRef<HTMLDivElement, Props>(function HuTaoStage({ line, children }, ref) {
  const { t } = useTranslation();
  const [missing, setMissing] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const last = useRef<HTMLSourceElement>(null);

  useEffect(() => {
    const v = video.current;
    const src = last.current;
    if (!v || !src) return;
    // Solo cuenta el error del último <source>: el primero falla sin más si el navegador no sabe leer H.264.
    const fail = () => setMissing(true);
    src.addEventListener("error", fail);
    v.muted = true;
    // Con «reducir movimiento», Hu Tao se queda quieta (el primer fotograma).
    if (!calm()) v.play().catch(() => undefined);
    return () => src.removeEventListener("error", fail);
  }, []);

  return (
    <div className="ht">
      <div className="ht-screen" ref={ref}>
        {missing ? (
          <div className="ht-missing">
            <span className="ht-missing-seal" aria-hidden>
              往生
            </span>
            <span>{t("merchant.videoMissing")}</span>
          </div>
        ) : (
          <video ref={video} className="ht-video" autoPlay={!calm()} muted loop playsInline disablePictureInPicture poster={HUTAO_VIDEO.poster}>
            <source src={HUTAO_VIDEO.mp4} type="video/mp4" />
            <source ref={last} src={HUTAO_VIDEO.webm} type="video/webm" />
          </video>
        )}
        <span className="ht-glass" aria-hidden />
        {children}
      </div>
      <Dialogue name={t("merchant.name")} text={line} />
    </div>
  );
});

/**
 * Cuadro de diálogo con la frase escrita letra a letra. El resto de la frase ya ocupa
 * su sitio (invisible), así el cuadro no cambia de alto mientras se escribe.
 * Un clic la completa.
 */
function Dialogue({ name, text }: { name: string; text: string }) {
  const chars = Array.from(text);
  const [shown, setShown] = useState(() => (calm() ? chars.length : 0));

  // Antes de pintar: así la frase nueva no asoma entera un fotograma.
  useLayoutEffect(() => {
    const total = Array.from(text).length;
    if (calm()) {
      setShown(total);
      return;
    }
    setShown(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= total) window.clearInterval(id);
    }, 24);
    return () => window.clearInterval(id);
  }, [text]);

  const done = shown >= chars.length;
  return (
    <div className="ht-box" onClick={() => setShown(chars.length)} aria-live="polite">
      <span className="ht-name">{name}</span>
      <p className="ht-text">
        {chars.slice(0, shown).join("")}
        <span className="ht-rest" aria-hidden>
          {chars.slice(shown).join("")}
        </span>
      </p>
      {done && <span className="ht-next" aria-hidden />}
    </div>
  );
}

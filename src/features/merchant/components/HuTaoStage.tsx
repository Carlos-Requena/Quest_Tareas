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
 * URL del vídeo en memoria (blob:), una por sesión. Se descarga entero en vez de darle
 * al <video> la ruta del archivo porque el WebView de macOS pide los vídeos por trozos
 * (cabecera Range) y el protocolo con el que Tauri sirve la app empaquetada no siempre
 * los atiende: el vídeo se quedaba en el póster. Con un blob no hay trozos que pedir.
 */
let cached: Promise<string> | undefined;
function videoUrl(): Promise<string> {
  if (!cached) {
    const probe = document.createElement("video");
    // H.264 donde se pueda (WebKit, WebView2); si no (Chromium de las pruebas), VP9.
    const mp4 = probe.canPlayType('video/mp4; codecs="avc1.64001F"') !== "";
    const src = mp4 ? HUTAO_VIDEO.mp4 : HUTAO_VIDEO.webm;
    cached = fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.blob();
      })
      .then((b) => URL.createObjectURL(b))
      .catch((err) => {
        cached = undefined;
        throw err;
      });
  }
  return cached;
}

/**
 * Escenario del mercader: Hu Tao en bucle, en su escaparate, con su cuadro de diálogo
 * como en un JRPG. Si el vídeo no está, queda su cartel y el diálogo sigue.
 */
export const HuTaoStage = forwardRef<HTMLDivElement, Props>(function HuTaoStage({ line, children }, ref) {
  const { t } = useTranslation();
  const [missing, setMissing] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    let alive = true;
    // Silenciado antes de darle la fuente: WebKit solo deja arrancar solo un vídeo mudo,
    // y React no pone el atributo `muted` en el HTML.
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    const play = () => {
      if (alive) v.play().catch(() => undefined);
    };
    // Si el WebView no lo deja arrancar solo, arranca con el primer gesto en la ventana.
    window.addEventListener("pointerdown", play, { once: true });
    v.addEventListener("canplay", play);
    videoUrl()
      .then((url) => {
        if (!alive) return;
        v.src = url;
        v.load();
      })
      .catch(() => alive && setMissing(true));
    return () => {
      alive = false;
      window.removeEventListener("pointerdown", play);
      v.removeEventListener("canplay", play);
      v.pause();
    };
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
          // Hu Tao se mueve también con «reducir movimiento»: es un bucle suave, sin
          // desplazamientos, y quieta parecía un fallo.
          <video
            ref={video}
            className="ht-video"
            muted
            loop
            playsInline
            disablePictureInPicture
            poster={HUTAO_VIDEO.poster}
            onError={() => setMissing(true)}
          />
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

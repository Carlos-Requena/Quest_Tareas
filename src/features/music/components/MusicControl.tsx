import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { music } from "../player";
import { useMusic } from "../useMusic";
import "../music.css";

/**
 * Botón de música con ecualizador animado. El volumen aparece en un desplegable
 * flotante (sin mover nada de la cabecera) al pasar el ratón o con el foco.
 */
export function MusicControl() {
  const s = useMusic();
  const { t } = useTranslation();

  // Con la preferencia activada, la música arranca con la primera interacción.
  useEffect(() => {
    music.armAutoplay();
  }, []);

  const track = t(`music.tracks.${s.trackId}`);
  let title: string;
  if (s.error) title = t("music.error");
  else if (s.muted) title = t("music.muted");
  else if (s.playing) title = `${t("music.pause")} · ${t("music.nowPlaying", { track })}`;
  else if (s.enabled) title = t("music.waiting");
  else title = t("music.play");

  return (
    <div className={`music ${s.playing ? "is-playing" : ""} ${s.muted ? "is-muted" : ""} ${s.error ? "is-error" : ""}`}>
      <button className="music-btn" title={title} aria-pressed={s.playing} onClick={() => music.toggle()}>
        <span className="music-eq" aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </span>
      </button>
      <div className="music-pop">
        <span className="music-pop-lbl">{t("music.volume")}</span>
        <input
          className="music-vol"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={s.volume}
          aria-label={t("music.volume")}
          onChange={(e) => music.setVolume(Number(e.target.value))}
          style={{ "--v": `${s.volume * 100}%` } as React.CSSProperties}
        />
        <span className="music-pop-val num">{Math.round(s.volume * 100)}</span>
      </div>
    </div>
  );
}

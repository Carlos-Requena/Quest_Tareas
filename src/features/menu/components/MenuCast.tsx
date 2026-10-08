import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import i18n from "../../../i18n";
import { useGame } from "../../../store/game";
import { useNow } from "../../../lib/time";
import { sfx } from "../../../lib/sfx";
import { BACKDROP_EXIT, MODAL_EXIT } from "../../../lib/motion";
import { useBlobUrl } from "../../equipment/useBlobUrl";
import { addCharacter, pickCharacter, removeCharacter } from "../actions";
import { allCharacters, prettyName, type MenuCharacter } from "../characters";
import { isVideoMime } from "../media";
import { characterOfDay, dayNumber, shownCharacter } from "../model";
import { useMenuUi } from "../ui";

/** Archivos que se pueden elegir para un personaje: imágenes (también animadas) y vídeos. */
export const CHARACTER_ACCEPT = "image/webp,image/png,image/avif,image/gif,image/*,video/webm,video/mp4,video/quicktime";

/** Los personajes y cuál toca: el de la rotación, el elegido a mano (en este equipo) y el de mañana. */
export function useCast() {
  const added = useGame((s) => s.state.characters);
  const pick = useMenuUi((s) => s.pick);
  const now = useNow(60_000);
  return useMemo(() => {
    const list = allCharacters(added.values());
    const ids = list.map((c) => c.id);
    const day = dayNumber(now);
    const byId = (id?: string) => list.find((c) => c.id === id);
    const shownId = shownCharacter(ids, now, pick);
    return {
      list,
      current: byId(shownId),
      rotation: byId(characterOfDay(ids, day)),
      tomorrow: byId(characterOfDay(ids, day + 1)),
      picked: pick?.day === day && shownId === pick.id ? pick.id : undefined,
    };
  }, [added, pick, now]);
}

/** Nombre de un personaje: el traducido si es de serie y lo tiene; si no, el de su archivo o el que se le puso. */
export function characterName(c: MenuCharacter | undefined, t: TFunction): string {
  if (!c) return "";
  if (!c.builtin) return c.name || t("menu.cast.unnamed");
  const key = `menu.cast.names.${c.key}`;
  return i18n.exists(key) ? String(t(key as never)) : prettyName(c.key ?? "");
}

/**
 * Imagen de un personaje: la de serie, o la del almacén (la miniatura mientras llega o si aún
 * no está en este equipo). Un vídeo se reproduce en bucle, sin sonido.
 */
export function CharacterImage({ c, className }: { c: MenuCharacter; className?: string }) {
  const blob = useBlobUrl(c.builtin ? undefined : c.blobId);
  const src = c.src ?? blob ?? c.thumb;
  if (!src) return null;
  if (blob && isVideoMime(c.mime))
    return <video className={className} src={blob} poster={c.thumb} autoPlay muted loop playsInline disablePictureInPicture aria-hidden />;
  return <img className={`${className ?? ""} ${!c.builtin && !blob ? "is-thumb" : ""}`} src={src} alt="" draggable={false} />;
}

/**
 * Selector de personajes, encima del menú: elegir uno para hoy (solo en este equipo; la
 * rotación sigue igual), volver a la rotación, añadir uno con su imagen o quitar uno añadido.
 */
export function MenuCast() {
  const open = useMenuUi((s) => s.cast);
  return <AnimatePresence>{open && <Panel key="cast" />}</AnimatePresence>;
}

function Panel() {
  const { t } = useTranslation();
  const cast = useCast();
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState<string>();
  const close = () => {
    sfx.move();
    useMenuUi.getState().setCast(false);
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true);
    try {
      await addCharacter(f);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <motion.div className="mn-cast-bg" onClick={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={BACKDROP_EXIT} />
      <motion.section
        className="mn-cast"
        role="dialog"
        aria-label={t("menu.cast.title")}
        initial={{ opacity: 0, x: 40, skewX: -4 }}
        animate={{ opacity: 1, x: 0, skewX: 0 }}
        exit={{ opacity: 0, x: 30, transition: MODAL_EXIT }}
        transition={{ type: "spring", stiffness: 340, damping: 32 }}
      >
        <header className="mn-cast-h">
          <span className="gem" />
          <span className="tag">Cast</span>
          <span className="sec-sub">{t("menu.cast.title")}</span>
          <span className="sec-line" />
          <button className="mn-cast-x" onClick={close} aria-label={t("menu.cast.close")} title={t("menu.cast.close")}>
            ×
          </button>
        </header>

        <div className="mn-cast-grid">
          {cast.list.map((c, i) => {
            const shown = cast.current?.id === c.id;
            return (
              <motion.div
                key={c.id}
                className={`mn-card ${shown ? "is-on" : ""}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * i, duration: 0.3 }}
              >
                <button className="mn-card-pick" onClick={() => pickCharacter(c.id === cast.rotation?.id ? undefined : c.id)} aria-pressed={shown}>
                  <span className="mn-card-art">
                    <CharacterImage c={c} />
                  </span>
                  <span className="mn-card-name">{characterName(c, t)}</span>
                  <span className="mn-card-tags">
                    {cast.rotation?.id === c.id && <span className="mn-card-tag">{t("menu.cast.today")}</span>}
                    {cast.picked === c.id && <span className="mn-card-tag is-picked">{t("menu.cast.picked")}</span>}
                  </span>
                </button>
                {!c.builtin && (
                  <button
                    className={`mn-card-rm ${armed === c.id ? "is-armed" : ""}`}
                    onClick={() => {
                      if (armed !== c.id) {
                        sfx.move();
                        setArmed(c.id);
                        setTimeout(() => setArmed((a) => (a === c.id ? undefined : a)), 3000);
                        return;
                      }
                      setArmed(undefined);
                      void removeCharacter(c.id);
                    }}
                  >
                    {armed === c.id ? t("menu.cast.confirm") : t("menu.cast.remove")}
                  </button>
                )}
              </motion.div>
            );
          })}

          <button className="mn-card is-add" onClick={() => file.current?.click()} disabled={busy}>
            <span className="mn-card-plus" aria-hidden>
              +
            </span>
            <span className="mn-card-name">{busy ? t("menu.cast.adding") : t("menu.cast.add")}</span>
            <span className="mn-card-hint">{t("menu.cast.addHint")}</span>
          </button>
          <input ref={file} type="file" accept={CHARACTER_ACCEPT} hidden onChange={onFile} />
        </div>

        <footer className="mn-cast-f">
          <p className="mn-cast-hint">{t("menu.cast.hint")}</p>
          <div className="mn-cast-row">
            {cast.tomorrow && <span className="mn-cast-next">{t("menu.cast.tomorrow", { name: characterName(cast.tomorrow, t) })}</span>}
            <button className="mn-cast-follow" disabled={!cast.picked} onClick={() => pickCharacter(undefined)}>
              {t("menu.cast.follow")}
            </button>
          </div>
        </footer>
      </motion.section>
    </>
  );
}

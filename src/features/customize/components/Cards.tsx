import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { sfx } from "../../../lib/sfx";
import { calm } from "../../../lib/fx";
import { useBlobUrl } from "../../equipment/useBlobUrl";
import { Sigil } from "../../menu/components/MenuIcons";
import { isVideoMime } from "../../menu/media";
import { TrashIcon } from "./CustomizeIcons";

/** Lo que pinta una tarjeta: una imagen de serie (`src`) o del jugador (su binario y miniatura). */
export interface CardArt {
  id: string;
  src?: string;
  blobId?: string;
  thumb?: string;
  /** Tipo del archivo del jugador: un vídeo se reproduce en bucle, sin sonido. */
  mime?: string;
  builtin: boolean;
}

/** Huecos «+» que completan la rejilla: al menos dos filas y, si no, hasta acabar la fila. */
export const slotsFor = (n: number, cols: number) => Math.max(1, Math.max(2 * cols, Math.ceil((n + 1) / cols) * cols) - n);

/** Imagen de una tarjeta: la de serie, o la del almacén (la miniatura, borrosa, mientras llega). */
export function CardImage({ art }: { art: CardArt }) {
  const blob = useBlobUrl(art.builtin ? undefined : art.blobId);
  const src = art.src ?? blob ?? art.thumb;
  if (!src) return null;
  if (blob && isVideoMime(art.mime)) return <video src={blob} poster={art.thumb} autoPlay muted loop playsInline disablePictureInPicture aria-hidden />;
  return <img className={!art.builtin && !blob ? "is-thumb" : ""} src={src} alt="" draggable={false} decoding="async" />;
}

interface CardProps {
  art: CardArt;
  name: string;
  i: number;
  /** Etiquetas de la esquina: «De serie», «Hoy»… */
  tags?: (string | false | undefined)[];
  /** Número del círculo de abajo (las frases de un personaje), con su rótulo. */
  count?: { n: number; label: string };
  on?: boolean;
  onPick(): void;
  /** Quitar (solo lo que añadió el jugador), con un segundo toque para confirmar. */
  onRemove?: () => void;
}

/**
 * Tarjeta de retrato, como las de una escuadra de un gacha: la imagen recortada por arriba,
 * una franja dorada en diagonal, la esquina con sus etiquetas y, abajo, una banda oscura
 * inclinada con el nombre.
 */
export function Card({ art, name, i, tags = [], count, on, onPick, onRemove }: CardProps) {
  const { t } = useTranslation();
  const [armed, setArmed] = useState(false);
  const still = calm();
  const shown = tags.filter((x): x is string => !!x);
  return (
    <motion.div
      className={`cz-card ${on ? "is-on" : ""} ${art.builtin ? "is-builtin" : ""}`}
      initial={still ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={still ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i, 12) * 0.03, duration: 0.3 }}
    >
      <button className="cz-card-pick" onClick={onPick} aria-pressed={on} aria-label={name} title={name}>
        <span className="cz-card-art">
          <CardImage art={art} />
        </span>
        <span className="cz-card-flag" aria-hidden>
          <span className="cz-card-gem" />
          {shown.map((tag) => (
            <span key={tag} className="cz-card-tag">
              {tag}
            </span>
          ))}
        </span>
        <span className="cz-card-foot">
          {count && (
            <span className="cz-card-count" aria-label={`${count.label}: ${count.n}`}>
              <small>{count.label}</small>
              <b className="num">{count.n}</b>
            </span>
          )}
          <b className="cz-card-name">{name}</b>
        </span>
      </button>
      {onRemove && (
        <button
          className={`cz-card-rm ${armed ? "is-armed" : ""}`}
          onClick={() => {
            if (!armed) {
              sfx.move();
              setArmed(true);
              setTimeout(() => setArmed(false), 3000);
              return;
            }
            setArmed(false);
            onRemove();
          }}
          title={armed ? t("customize.card.confirm") : t("customize.card.remove")}
          aria-label={armed ? t("customize.card.confirm") : t("customize.card.remove")}
        >
          <TrashIcon />
          {armed && <span>{t("customize.card.confirm")}</span>}
        </button>
      )}
    </motion.div>
  );
}

/**
 * Huecos vacíos con su «+», como los de una escuadra sin completar. Todos abren el selector
 * de archivos; el primero dice qué se añade. `onFile` recibe la imagen elegida.
 */
export function AddSlots({
  count,
  label,
  hint,
  from,
  accept = "image/webp,image/png,image/avif,image/*",
  onFile,
}: {
  count: number;
  label: string;
  /** Qué se puede elegir (debajo del rótulo del primer hueco); por defecto, el genérico. */
  hint?: string;
  from: number;
  /** Tipos del selector de archivos. */
  accept?: string;
  onFile(f: File): Promise<unknown>;
}) {
  const { t } = useTranslation();
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const still = calm();
  const pick = () => {
    if (busy) return;
    sfx.move();
    file.current?.click();
  };
  const onChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true);
    try {
      await onFile(f);
    } finally {
      setBusy(false);
    }
  };
  const slot = (k: number, body?: ReactNode) => (
    <motion.button
      key={k}
      className={`cz-slot ${k === 0 ? "is-first" : ""}`}
      onClick={pick}
      disabled={busy}
      aria-label={label}
      title={label}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: still ? 0 : Math.min(from + k, 14) * 0.03, duration: 0.3 }}
    >
      <span className="cz-slot-seal" aria-hidden>
        <Sigil />
      </span>
      <span className="cz-slot-plus" aria-hidden />
      {body}
      <span className="cz-card-foot" aria-hidden />
    </motion.button>
  );
  return (
    <>
      {Array.from({ length: count }, (_, k) =>
        slot(
          k,
          k === 0 && (
            <span className="cz-slot-txt">
              <b>{busy ? t("customize.add.adding") : label}</b>
              <small>{hint ?? t("customize.add.hint")}</small>
            </span>
          ),
        ),
      )}
      <input ref={file} type="file" accept={accept} hidden onChange={onChange} />
    </>
  );
}

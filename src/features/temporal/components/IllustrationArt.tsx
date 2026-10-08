import { useBlobUrl } from "../../equipment/useBlobUrl";
import type { Illustration } from "../heroes";

/**
 * Ilustración de un tipo de encargo, impresa en tinta sepia sobre el pergamino como la
 * silueta del aventurero: la de «Encargo cumplido» y la vista previa de la ventana de
 * personalización. `className` la coloca; el aspecto es `.t-art` (temporal.css).
 */
export function IllustrationArt({ ill, className }: { ill: Illustration; className?: string }) {
  const blob = useBlobUrl(ill.builtin ? undefined : ill.blobId);
  const src = ill.src ?? blob ?? ill.thumb;
  return (
    <div className={`t-art ${className ?? ""}`} aria-hidden>
      {src && <img src={src} alt="" draggable={false} decoding="async" />}
    </div>
  );
}

import type { ReactNode } from "react";
import { useGame } from "../../../store/game";
import { useBlobUrl } from "../useBlobUrl";
import { wornIn } from "../model";
import { gearStyle } from "../../merchant/components/GearArt";
import { useTranslation } from "react-i18next";
import { builtinArt } from "../../armory/model";
import { gearName } from "../../armory/labels";
import "../equipment.css";

/**
 * Fondo de la app. Con un fondo comprado al mercader, su imagen va detrás de todo,
 * oscurecida para que el tablón se siga leyendo. Mientras carga la imagen grande (o si
 * este equipo no la tiene) se usa su icono, difuminado.
 */
export function Backdrop() {
  const g = useGame((s) => wornIn(s.state.player.equipped, s.state.gear, "backdrop"));
  const blob = useBlobUrl(g?.art?.blobId);
  // Los fondos de serie traen su escena a tamaño grande (SVG); los del jugador, en el almacén de binarios.
  const big = blob ?? builtinArt(g?.id);
  const src = big ?? (g?.image || undefined);
  return (
    <div className="backdrop">
      {src && (
        <div
          key={src}
          className={`backdrop-art ${big ? "" : "is-icon"}`}
          style={{ "--bd-img": `url("${src}")` } as React.CSSProperties}
        />
      )}
    </div>
  );
}

/** Emblema de la cabecera: el comprado al mercader dentro del rombo, o el de siempre. */
export function DecorEmblem({ fallback, size = 64 }: { fallback: ReactNode; size?: number }) {
  const g = useGame((s) => wornIn(s.state.player.equipped, s.state.gear, "emblem"));
  const { t } = useTranslation();
  if (!g?.image) return <>{fallback}</>;
  return (
    <span className="demb" style={{ ...gearStyle(g), width: size, height: size }} title={gearName(g, t)}>
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <defs>
          <clipPath id="demb-clip">
            <rect x="14" y="14" width="36" height="36" transform="rotate(45 32 32)" />
          </clipPath>
        </defs>
        <rect className="demb-glow" x="14" y="14" width="36" height="36" transform="rotate(45 32 32)" />
        <image href={g.image} x="7" y="7" width="50" height="50" preserveAspectRatio="xMidYMid slice" clipPath="url(#demb-clip)" />
        <rect x="10" y="10" width="44" height="44" transform="rotate(45 32 32)" fill="none" stroke="var(--gold)" strokeWidth="1.5" />
        <rect x="14" y="14" width="36" height="36" transform="rotate(45 32 32)" fill="none" stroke="var(--rc)" strokeWidth="1.2" />
      </svg>
    </span>
  );
}

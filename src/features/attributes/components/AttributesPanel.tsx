import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { useGame } from "../../../store/game";
import { num } from "../../../i18n";
import { RADAR_AXES, RADAR_MIN_AXES, radarPoints, radarScale, type Attribute } from "../model";
import "../attributes.css";

/** Panel de atributos: el radar de las áreas con más experiencia y la lista completa. */
export function AttributesPanel() {
  const { t } = useTranslation();
  const attrs = useGame((s) => s.state.player.attributes);
  const axes = attrs.slice(0, RADAR_AXES);

  return (
    <div className="attrs">
      <h3 className="sec-h">
        <span className="gem" />
        <span className="tag">Attributes</span>
        <span className="sec-sub">{t("attributes.subtitle")}</span>
        <span className="sec-line" />
      </h3>

      {attrs.length === 0 ? (
        <p className="attrs-empty muted">{t("attributes.empty")}</p>
      ) : (
        <>
          {axes.length >= RADAR_MIN_AXES ? (
            <Radar attrs={axes} label={t("attributes.radar", { n: axes.length })} />
          ) : (
            <p className="attrs-few muted">{t("attributes.few")}</p>
          )}
          <ul className="attrs-list">
            {attrs.map((a, i) => (
              <li key={a.key} className="attr">
                <span className="attr-name" title={a.name}>
                  {a.name}
                </span>
                <span className="attr-lv num">{t("attributes.level", { n: a.level })}</span>
                <span className="attr-bar" title={t("attributes.next", { xp: num(a.levelXpNeeded - a.levelXp), n: a.level + 1 })}>
                  <motion.span
                    className="attr-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (a.levelXp / a.levelXpNeeded) * 100)}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 22, delay: Math.min(i, 8) * 0.04 }}
                  />
                </span>
                <span className="attr-meta muted">
                  {t("attributes.quests", { count: a.quests })} · {t("attributes.xp", { xp: num(a.xp) })}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="attrs-note muted">{t("attributes.noArea")}</p>
    </div>
  );
}

const R = 92;
const CX = 150;
const CY = 118;

/** Radar: un eje por área, con el borde en el múltiplo de 5 por encima del nivel más alto. */
function Radar({ attrs, label }: { attrs: Attribute[]; label: string }) {
  const scale = radarScale(attrs);
  const n = attrs.length;
  const ring = (f: number) =>
    radarPoints(Array(n).fill(scale * f), scale)
      .map((p) => `${CX + p.x * R},${CY + p.y * R}`)
      .join(" ");
  const pts = radarPoints(
    attrs.map((a) => a.level + a.levelXp / a.levelXpNeeded),
    scale,
  );
  const shape = pts.map((p) => `${CX + p.x * R},${CY + p.y * R}`).join(" ");
  const tips = radarPoints(Array(n).fill(scale), scale);

  return (
    <figure className="radar" aria-label={label}>
      <svg viewBox="0 0 300 236">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon key={f} className={`radar-ring ${f === 1 ? "is-edge" : ""}`} points={ring(f)} />
        ))}
        {tips.map((p, i) => (
          <line key={i} className="radar-axis" x1={CX} y1={CY} x2={CX + p.x * R} y2={CY + p.y * R} />
        ))}
        <motion.polygon
          className="radar-shape"
          points={shape}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ transformOrigin: `${CX}px ${CY}px` }}
          transition={{ type: "spring", stiffness: 140, damping: 18 }}
        />
        {pts.map((p, i) => (
          <circle key={i} className="radar-dot" cx={CX + p.x * R} cy={CY + p.y * R} r="3" />
        ))}
        {tips.map((p, i) => {
          const x = CX + p.x * (R + 14);
          const y = CY + p.y * (R + 14);
          const anchor = Math.abs(p.x) < 0.2 ? "middle" : p.x > 0 ? "start" : "end";
          const name = attrs[i].name.length > 14 ? `${attrs[i].name.slice(0, 13)}…` : attrs[i].name;
          return (
            <text key={i} className="radar-lbl" x={x} y={y + (p.y > 0.2 ? 10 : p.y < -0.2 ? -4 : 4)} textAnchor={anchor}>
              {name}
              <tspan className="radar-lv" dx="5">
                {attrs[i].level}
              </tspan>
            </text>
          );
        })}
        <text className="radar-scale" x={CX + 5} y={CY - R + 12}>
          {scale}
        </text>
      </svg>
    </figure>
  );
}

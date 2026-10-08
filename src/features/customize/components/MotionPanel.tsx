import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { isVideoMime } from "../../menu/media";
import type { MenuCharacter } from "../../menu/characters";
import {
  AURAS,
  AURA_TOKEN,
  ENTRANCES,
  LEVELS,
  PARTICLES,
  isCustomized,
  resetCharacterStyle,
  setCharacterStyle,
  useCharacterStyle,
  type Level,
  type StylePatch,
} from "../../living";
import { useCustomizeUi } from "../ui";

const LEVEL_KEY = ["off", "soft", "normal", "strong"] as const;

/**
 * Cómo se mueve un personaje (features/living): respiración, balanceo y viento, aura, brillo,
 * partículas, entrada y bordes suaves. Cada cambio se guarda al momento (es un evento) y la
 * vista previa de la izquierda lo enseña en vivo.
 */
export function MotionPanel({ c }: { c: MenuCharacter }) {
  const { t } = useTranslation();
  const style = useCharacterStyle(c.id);
  const custom = useGame((s) => isCustomized(s.state.characterStyles, c.id));
  const video = isVideoMime(c.mime);
  const set = (patch: StylePatch) => void setCharacterStyle(c.id, patch);
  const replay = () => useCustomizeUi.getState().set({ replay: useCustomizeUi.getState().replay + 1 });

  const levels = (key: "breath" | "sway" | "wind", disabled?: boolean) => (
    <Seg
      value={style[key]}
      options={LEVELS.map((l) => ({ value: l, label: t(`living.levels.${LEVEL_KEY[l]}`) }))}
      onPick={(v: Level) => set({ [key]: v })}
      disabled={disabled}
    />
  );

  return (
    <section className="cz-mo">
      <div className="cz-mo-rows">
        <Row label={t("living.fields.breath.label")} hint={t("living.fields.breath.hint")}>
          {levels("breath")}
        </Row>
        <Row label={t("living.fields.sway.label")} hint={t("living.fields.sway.hint")}>
          {levels("sway")}
        </Row>
        <Row label={t("living.fields.wind.label")} hint={c.animated ? t("living.fields.windAnimated") : t("living.fields.wind.hint")}>
          {levels("wind", c.animated)}
        </Row>
        <Row label={t("living.fields.aura.label")} hint={t("living.fields.aura.hint")}>
          <div className="cz-swatches" role="radiogroup" aria-label={t("living.fields.aura.label")}>
            {AURAS.map((a) => (
              <button
                key={a}
                role="radio"
                aria-checked={style.aura === a}
                className={`cz-swatch ${style.aura === a ? "is-on" : ""} ${a === "none" ? "is-none" : ""}`}
                style={a === "none" ? undefined : { background: AURA_TOKEN[a] }}
                title={t(`living.auras.${a}`)}
                aria-label={t(`living.auras.${a}`)}
                onClick={() => set({ aura: a })}
              />
            ))}
          </div>
        </Row>
        <Row label={t("living.fields.shine.label")} hint={video ? t("living.fields.shineVideo") : t("living.fields.shine.hint")}>
          <OnOff value={style.shine} onPick={(v) => set({ shine: v })} disabled={video} />
        </Row>
        <Row label={t("living.fields.particles.label")} hint={t("living.fields.particles.hint")}>
          <Seg wrap value={style.particles} options={PARTICLES.map((p) => ({ value: p, label: t(`living.particles.${p}`) }))} onPick={(v) => set({ particles: v })} />
        </Row>
        <Row label={t("living.fields.entrance.label")} hint={t("living.fields.entrance.hint")}>
          <div className="cz-mo-entrance">
            <Seg
              value={style.entrance}
              options={ENTRANCES.map((e) => ({ value: e, label: t(`living.entrances.${e}`) }))}
              onPick={(v) => {
                set({ entrance: v });
                replay();
              }}
            />
            <button className="btn btn-ghost cz-mo-replay" onClick={replay}>
              ▶ {t("living.replay")}
            </button>
          </div>
        </Row>
        <Row label={t("living.fields.fade.label")} hint={t("living.fields.fade.hint")}>
          <OnOff value={style.fade} onPick={(v) => set({ fade: v })} />
        </Row>
      </div>
      <footer className="cz-mo-foot">
        <span className="muted">{t("living.resetHint")}</span>
        <button className="btn btn-ghost cz-mo-reset" disabled={!custom} onClick={() => void resetCharacterStyle(c.id)}>
          {t("living.reset")}
        </button>
      </footer>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="cz-mo-row">
      <span className="cz-mo-lbl">
        <b>{label}</b>
        <small>{hint}</small>
      </span>
      <span className="cz-mo-ctl">{children}</span>
    </div>
  );
}

/** Botones de una opción entre varias, como las pestañas de las partes del día pero en pequeño. */
function Seg<T extends string | number>({ value, options, onPick, disabled, wrap }: { value: T; options: { value: T; label: string }[]; onPick(v: T): void; disabled?: boolean; wrap?: boolean }) {
  return (
    <span className={`cz-seg ${wrap ? "is-wrap" : ""}`} role="radiogroup">
      {options.map((o) => (
        <button key={String(o.value)} role="radio" aria-checked={o.value === value} disabled={disabled} className={`cz-seg-b ${o.value === value ? "is-on" : ""}`} onClick={() => onPick(o.value)}>
          {o.label}
        </button>
      ))}
    </span>
  );
}

function OnOff({ value, onPick, disabled }: { value: boolean; onPick(v: boolean): void; disabled?: boolean }) {
  const { t } = useTranslation();
  return (
    <Seg
      value={value ? 1 : 0}
      options={[
        { value: 0, label: t("living.off") },
        { value: 1, label: t("living.on") },
      ]}
      onPick={(v) => onPick(v === 1)}
      disabled={disabled}
    />
  );
}

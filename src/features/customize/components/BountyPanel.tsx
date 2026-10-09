import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { sfx } from "../../../lib/sfx";
import { KIND_META, TEMPORAL_KINDS, type TemporalKind } from "../../temporal/model";
import { illustrationsOf, type Illustration } from "../../temporal/heroes";
import { addTemporalArt, removeTemporalArt } from "../../temporal/actions";
import { IllustrationArt } from "../../temporal/components/IllustrationArt";
import { quote } from "../../temporal/components/PostedOverlay";
import { useCustomizeUi } from "../ui";
import { useGridCols } from "../columns";
import { AddSlots, Card, slotsFor } from "./Cards";

/**
 * Pestaña de las ilustraciones de «Encargo cumplido»: las de un tipo de encargo (las de serie
 * y las del jugador, con los huecos «+»), la vista previa de cómo se imprime en el pergamino y,
 * abajo, un botón por tipo, como las escuadras de un gacha.
 */
export function BountyPanel() {
  const { t } = useTranslation();
  const kind = useCustomizeUi((s) => s.kind);
  const selected = useCustomizeUi((s) => s.art);
  const arts = useGame((s) => s.state.temporalArts);
  const cols = useGridCols(4, 3);
  const byKind = useMemo(() => new Map(TEMPORAL_KINDS.map((k) => [k, illustrationsOf(k, arts.values())])), [arts]);
  const list = byKind.get(kind) ?? [];
  const shown = list.find((i) => i.id === selected) ?? list[0];

  const setKind = (k: TemporalKind) => {
    if (k === kind) return;
    sfx.move();
    useCustomizeUi.getState().set({ kind: k, art: undefined });
  };

  return (
    <>
      <p className="cz-desc">{t("customize.desc.bounties")}</p>
      <div className="cz-bounty">
        <div className="cz-scroll">
          <div className="cz-grid" style={{ "--cols": cols } as React.CSSProperties}>
            {list.map((ill, i) => (
              <Card
                key={ill.id}
                i={i}
                art={ill}
                name={ill.name}
                tags={[ill.builtin && t("customize.card.builtin")]}
                on={ill.id === shown?.id}
                onPick={() => {
                  sfx.move();
                  useCustomizeUi.getState().set({ art: ill.id });
                }}
                onRemove={ill.builtin ? undefined : () => void removeTemporalArt(ill.id)}
              />
            ))}
            <AddSlots count={slotsFor(list.length, cols)} from={list.length} label={t("customize.add.art")} onFile={(f) => addTemporalArt(kind, f)} />
          </div>
        </div>
        <Preview kind={kind} ill={shown} />
      </div>

      <nav className="cz-kinds" role="tablist">
        {TEMPORAL_KINDS.map((k) => (
          <button key={k} role="tab" aria-selected={k === kind} className={`cz-kind ${k === kind ? "is-on" : ""} ${KIND_META[k].red ? "is-red" : ""}`} onClick={() => setKind(k)}>
            <span className="cz-kind-tag">{KIND_META[k].tag}</span>
            <b>{t(`temporal.kinds.${k}`)}</b>
            <span className="num cz-kind-n">{byKind.get(k)?.length ?? 0}</span>
          </button>
        ))}
      </nav>
    </>
  );
}

/** Un pergamino pequeño de «Encargo cumplido» con la ilustración impresa como en la animación. */
function Preview({ kind, ill }: { kind: TemporalKind; ill?: Illustration }) {
  const { t } = useTranslation();
  return (
    <aside className="cz-preview" aria-label={t("customize.bounty.preview")}>
      <span className="cz-preview-h">
        <span className="gem" />
        {t("customize.bounty.preview")}
      </span>
      <div className="cz-sheet">
        {ill && <IllustrationArt key={ill.id} ill={ill} className="cz-print" />}
        <span className="cz-sheet-head">{t("temporal.clear.header")}</span>
        <span className="cz-sheet-kind">{t(`temporal.kinds.${kind}`)}</span>
        <b className="cz-sheet-done">{quote(t("temporal.clear.done"))}</b>
      </div>
      <p className="cz-preview-hint">{ill ? t("customize.bounty.previewHint") : t("customize.bounty.empty")}</p>
    </aside>
  );
}

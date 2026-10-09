import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { sfx } from "../../../lib/sfx";
import { addCharacter, removeCharacter } from "../../menu/actions";
import { CHARACTER_ACCEPT, characterName, useCast } from "../../menu/components/MenuCast";
import { companionOf } from "../../companion";
import type { VoiceLine } from "../../menu/model";
import { useCustomizeUi } from "../ui";
import { useGridCols } from "../columns";
import { AddSlots, Card, slotsFor } from "./Cards";
import { CharacterEditor } from "./CharacterEditor";

/**
 * Pestaña de los personajes del menú: la rejilla de retratos (los de serie y los añadidos,
 * con los huecos «+» para añadir más) y, al elegir uno, el editor de lo que dice.
 */
export function CastPanel() {
  const { t } = useTranslation();
  const cast = useCast();
  const lines = useGame((s) => s.state.voiceLines);
  const chosen = useGame((s) => s.state.companion.chosen);
  const editing = useCustomizeUi((s) => s.character);
  const cols = useGridCols(6, 5);
  const counts = useMemo(() => countBy(lines.values()), [lines]);

  const companion = companionOf(
    cast.list.map((c) => c.id),
    cast.current?.id,
    chosen,
  );

  const picked = editing ? cast.list.find((c) => c.id === editing) : undefined;
  if (picked) return <CharacterEditor c={picked} />;

  return (
    <>
      <p className="cz-desc">{t("customize.desc.cast")}</p>
      <div className="cz-scroll">
        <div className="cz-grid" style={{ "--cols": cols } as React.CSSProperties}>
          {cast.list.map((c, i) => (
            <Card
              key={c.id}
              i={i}
              art={c}
              name={characterName(c, t)}
              tags={[c.builtin && t("customize.card.builtin"), cast.current?.id === c.id && t("customize.card.today"), companion === c.id && t("customize.card.companion")]}
              count={{ n: counts.get(c.id) ?? 0, label: t("customize.card.voice") }}
              onPick={() => {
                sfx.move();
                useCustomizeUi.getState().set({ character: c.id, replay: 0 });
              }}
              onRemove={c.builtin ? undefined : () => void removeCharacter(c.id)}
            />
          ))}
          <AddSlots
            count={slotsFor(cast.list.length, cols)}
            from={cast.list.length}
            label={t("customize.add.character")}
            hint={t("customize.add.characterHint")}
            accept={CHARACTER_ACCEPT}
            onFile={addCharacter}
          />
        </div>
      </div>
    </>
  );
}

/** Frases de cada personaje. */
function countBy(lines: Iterable<VoiceLine>): Map<string, number> {
  const out = new Map<string, number>();
  for (const l of lines) out.set(l.characterId, (out.get(l.characterId) ?? 0) + 1);
  return out;
}

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Category, QuestDef } from "../domain/types";
import { CATEGORY_META } from "../domain/types";
import { useGame } from "../store/game";
import { uid } from "../lib/id";
import { sfx } from "../lib/sfx";

const DEFAULT_REWARD: Record<Category, { xp: number; gold: number }> = {
  elite: { xp: 400, gold: 200 },
  repeat: { xp: 100, gold: 50 },
  request: { xp: 150, gold: 80 },
};

const COOLDOWNS: [number, string][] = [
  [60, "1 hora"],
  [4 * 60, "4 horas"],
  [8 * 60, "8 horas"],
  [20 * 60, "20 horas (diaria)"],
  [3 * 24 * 60, "3 días"],
  [7 * 24 * 60, "1 semana"],
];

interface CondDraft {
  id: string;
  label: string;
  target: number;
}

export function CreateQuestModal() {
  const open = useGame((s) => s.creating);
  return <AnimatePresence>{open && <Modal />}</AnimatePresence>;
}

function Modal() {
  const setCreating = useGame((s) => s.setCreating);
  const dispatch = useGame((s) => s.dispatch);
  const select = useGame((s) => s.select);
  const setTab = useGame((s) => s.setTab);
  const say = useGame((s) => s.say);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("request");
  const [client, setClient] = useState("");
  const [area, setArea] = useState("");
  const [kind, setKind] = useState("");
  const [description, setDescription] = useState("");
  const [conds, setConds] = useState<CondDraft[]>([{ id: uid(), label: "", target: 1 }]);
  const [xp, setXp] = useState(DEFAULT_REWARD.request.xp);
  const [gold, setGold] = useState(DEFAULT_REWARD.request.gold);
  const [rewardTouched, setRewardTouched] = useState(false);
  const [item, setItem] = useState("");
  const [cooldown, setCooldown] = useState(20 * 60);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => titleRef.current?.focus(), []);

  const close = () => setCreating(false);

  const valid = title.trim() && conds.some((c) => c.label.trim() && c.target > 0);

  const submit = async () => {
    if (!valid) return;
    const quest: QuestDef = {
      id: uid(),
      title: title.trim(),
      category,
      client: client.trim(),
      area: area.trim(),
      kind: kind.trim(),
      description: description.trim(),
      conditions: conds
        .filter((c) => c.label.trim() && c.target > 0)
        .map((c) => ({ id: c.id, label: c.label.trim(), target: Math.round(c.target) })),
      reward: { xp: Math.max(0, xp), gold: Math.max(0, gold), item: item.trim() || undefined },
      cooldownMinutes: category === "repeat" ? cooldown : undefined,
      createdAt: Date.now(),
    };
    await dispatch({ type: "quest_created", quest });
    sfx.tick();
    setTab("all");
    select(quest.id);
    say(`«${quest.title}» publicada en el tablón`);
    close();
  };

  const onKey = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Escape") close();
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
  };

  const pickCategory = (c: Category) => {
    setCategory(c);
    if (!rewardTouched) {
      setXp(DEFAULT_REWARD[c].xp);
      setGold(DEFAULT_REWARD[c].gold);
    }
  };

  return (
    <motion.div
      className="modal-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
      onKeyDown={onKey}
    >
      <motion.form
        className="modal"
        style={{ "--cat": CATEGORY_META[category].color } as React.CSSProperties}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <header className="modal-h">
          <span className="gem" />
          <span className="tag">New Posting</span>
          <span className="sec-sub">Publicar quest</span>
          <span className="sec-line" />
        </header>

        <div className="modal-body">
          <label className="field field-title">
            <span className="lbl">Título</span>
            <input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Derrotar al Dragón del Papeleo" />
          </label>

          <div className="field">
            <span className="lbl">Categoría</span>
            <div className="seg">
              {(Object.keys(CATEGORY_META) as Category[]).map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`seg-btn ${category === c ? "on" : ""}`}
                  style={{ "--c": CATEGORY_META[c].color } as React.CSSProperties}
                  onClick={() => pickCategory(c)}
                >
                  <span className="gem" />
                  {CATEGORY_META[c].label}
                </button>
              ))}
            </div>
          </div>

          <div className="row3">
            <label className="field">
              <span className="lbl">Encargado por</span>
              <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Gremio del Yo Adulto" />
            </label>
            <label className="field">
              <span className="lbl">Área</span>
              <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Salud, Hogar…" />
            </label>
            <label className="field">
              <span className="lbl">Tipo</span>
              <input value={kind} onChange={(e) => setKind(e.target.value)} placeholder="Entrenamiento" />
            </label>
          </div>

          <label className="field">
            <span className="lbl">Descripción</span>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Cuenta la historia del encargo…" />
          </label>

          <div className="field">
            <span className="lbl">Objetivos</span>
            <div className="cond-edit">
              {conds.map((c, i) => (
                <div key={c.id} className="cond-edit-row">
                  <input
                    value={c.label}
                    placeholder={i === 0 ? "Leer páginas" : "Otro objetivo"}
                    onChange={(e) => setConds(conds.map((x) => (x.id === c.id ? { ...x, label: e.target.value } : x)))}
                  />
                  <span className="muted">×</span>
                  <input
                    type="number"
                    min={1}
                    className="num-in"
                    value={c.target}
                    onChange={(e) => setConds(conds.map((x) => (x.id === c.id ? { ...x, target: Number(e.target.value) } : x)))}
                  />
                  <button
                    type="button"
                    className="icon-btn"
                    disabled={conds.length === 1}
                    onClick={() => setConds(conds.filter((x) => x.id !== c.id))}
                    title="Quitar objetivo"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" className="add-cond" onClick={() => setConds([...conds, { id: uid(), label: "", target: 1 }])}>
                + Añadir objetivo
              </button>
            </div>
          </div>

          <div className="row3">
            <label className="field">
              <span className="lbl">Experiencia</span>
              <input type="number" min={0} step={10} value={xp} onChange={(e) => (setXp(Number(e.target.value)), setRewardTouched(true))} />
            </label>
            <label className="field">
              <span className="lbl">Oro</span>
              <input type="number" min={0} step={10} value={gold} onChange={(e) => (setGold(Number(e.target.value)), setRewardTouched(true))} />
            </label>
            <label className="field">
              <span className="lbl">Objeto (opcional)</span>
              <input value={item} onChange={(e) => setItem(e.target.value)} placeholder="Poción de Vigor" />
            </label>
          </div>

          {category === "repeat" && (
            <label className="field">
              <span className="lbl">Reaparece tras completarla</span>
              <select value={cooldown} onChange={(e) => setCooldown(Number(e.target.value))}>
                {COOLDOWNS.map(([m, l]) => (
                  <option key={m} value={m}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <footer className="modal-f">
          <span className="muted hint">
            <kbd>⌘</kbd>+<kbd>Enter</kbd> publicar · <kbd>Esc</kbd> cerrar
          </span>
          <button type="button" className="btn btn-ghost" onClick={close}>
            Cancelar
          </button>
          <button type="submit" className={`btn btn-primary ${valid ? "" : "is-disabled"}`} disabled={!valid}>
            Publicar quest
          </button>
        </footer>
      </motion.form>
    </motion.div>
  );
}

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import type { Category, ConditionDef, QuestDef } from "../domain/types";
import { CATEGORY_META } from "../domain/types";
import { useGame } from "../store/game";
import { uid } from "../lib/id";
import { sfx } from "../lib/sfx";
import i18n from "../i18n";
import { DEFAULT_POMODORO, PomodoroConditionInputs, clampPlan } from "../features/pomodoro";
import { GuaranteedItemSelect, LootHint } from "../features/items";

const DEFAULT_REWARD: Record<Category, { xp: number; gold: number }> = {
  elite: { xp: 400, gold: 200 },
  repeat: { xp: 100, gold: 50 },
  request: { xp: 150, gold: 80 },
};

type CooldownOption = { minutes: number; unit: "hours" | "days" | "week"; count: number; daily?: boolean };

const COOLDOWNS: CooldownOption[] = [
  { minutes: 60, unit: "hours", count: 1 },
  { minutes: 4 * 60, unit: "hours", count: 4 },
  { minutes: 8 * 60, unit: "hours", count: 8 },
  { minutes: 20 * 60, unit: "hours", count: 20, daily: true },
  { minutes: 3 * 24 * 60, unit: "days", count: 3 },
  { minutes: 7 * 24 * 60, unit: "week", count: 1 },
];

/** Tecla modificadora del atajo de publicar: ⌘ en macOS, Ctrl en Windows. */
const MOD_KEY = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";

interface CondDraft {
  id: string;
  kind: "count" | "pomodoro";
  label: string;
  /** Contador: cantidad. Pomodoro: rondas. */
  target: number;
  focusMinutes: number;
  breakMinutes: number;
}

const newCond = (kind: CondDraft["kind"]): CondDraft => ({ id: uid(), kind, label: "", target: 1, ...DEFAULT_POMODORO });

const isUsable = (c: CondDraft) => c.kind === "pomodoro" || (c.label.trim() !== "" && c.target > 0);

function toCondition(c: CondDraft): ConditionDef {
  if (c.kind === "count") return { id: c.id, kind: "count", label: c.label.trim(), target: Math.round(c.target) };
  const plan = clampPlan({ rounds: c.target, focusMinutes: c.focusMinutes, breakMinutes: c.breakMinutes });
  return {
    id: c.id,
    kind: "pomodoro",
    label: c.label.trim(),
    target: plan.rounds,
    focusMinutes: plan.focusMinutes,
    breakMinutes: plan.breakMinutes,
  };
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
  const { t } = useTranslation();

  const cooldownLabel = (o: CooldownOption) => {
    const base = o.unit === "week" ? t("cooldowns.week") : t(`cooldowns.${o.unit}`, { count: o.count });
    return o.daily ? t("cooldowns.daily", { label: base }) : base;
  };

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("request");
  const [client, setClient] = useState("");
  const [area, setArea] = useState("");
  const [kind, setKind] = useState("");
  const [description, setDescription] = useState("");
  const [conds, setConds] = useState<CondDraft[]>([newCond("count")]);
  const [xp, setXp] = useState(DEFAULT_REWARD.request.xp);
  const [gold, setGold] = useState(DEFAULT_REWARD.request.gold);
  const [rewardTouched, setRewardTouched] = useState(false);
  const [itemId, setItemId] = useState("");
  const [cooldown, setCooldown] = useState(20 * 60);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => titleRef.current?.focus(), []);

  const close = () => setCreating(false);

  const valid = title.trim() && conds.some(isUsable);
  const updateCond = (id: string, patch: Partial<CondDraft>) =>
    setConds(conds.map((x) => (x.id === id ? { ...x, ...patch } : x)));

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
      conditions: conds.filter(isUsable).map(toCondition),
      reward: { xp: Math.max(0, xp), gold: Math.max(0, gold), itemId: itemId || undefined },
      cooldownMinutes: category === "repeat" ? cooldown : undefined,
      createdAt: Date.now(),
    };
    await dispatch({ type: "quest_created", quest });
    sfx.tick();
    setTab("all");
    select(quest.id);
    say(() => i18n.t("toast.published", { title: quest.title }));
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
          <span className="sec-sub">{t("modal.subtitle")}</span>
          <span className="sec-line" />
        </header>

        <div className="modal-body">
          <label className="field field-title">
            <span className="lbl">{t("modal.title")}</span>
            <input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("modal.titlePh")} />
          </label>

          <div className="field">
            <span className="lbl">{t("modal.category")}</span>
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
                  {t(`category.${c}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="row3">
            <label className="field">
              <span className="lbl">{t("modal.client")}</span>
              <input value={client} onChange={(e) => setClient(e.target.value)} placeholder={t("modal.clientPh")} />
            </label>
            <label className="field">
              <span className="lbl">{t("modal.area")}</span>
              <input value={area} onChange={(e) => setArea(e.target.value)} placeholder={t("modal.areaPh")} />
            </label>
            <label className="field">
              <span className="lbl">{t("modal.kind")}</span>
              <input value={kind} onChange={(e) => setKind(e.target.value)} placeholder={t("modal.kindPh")} />
            </label>
          </div>

          <label className="field">
            <span className="lbl">{t("modal.description")}</span>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("modal.descriptionPh")} />
          </label>

          <div className="field">
            <span className="lbl">{t("modal.conditions")}</span>
            <div className="cond-edit">
              {conds.map((c, i) => {
                const remove = (
                  <button
                    type="button"
                    className="icon-btn"
                    disabled={conds.length === 1}
                    onClick={() => setConds(conds.filter((x) => x.id !== c.id))}
                    title={t("modal.removeCondition")}
                  >
                    ✕
                  </button>
                );
                if (c.kind === "pomodoro") {
                  return (
                    <div key={c.id} className="cond-edit-pomo">
                      <div className="cond-edit-row is-pomo">
                        <span className="cond-edit-kind">◷ {t("pomodoro.kind")}</span>
                        <input
                          value={c.label}
                          placeholder={t("pomodoro.form.labelPh")}
                          onChange={(e) => updateCond(c.id, { label: e.target.value })}
                        />
                        {remove}
                      </div>
                      <PomodoroConditionInputs value={c} onChange={(v) => updateCond(c.id, v)} />
                    </div>
                  );
                }
                return (
                  <div key={c.id} className="cond-edit-row">
                    <input
                      value={c.label}
                      placeholder={i === 0 ? t("modal.conditionPh") : t("modal.conditionPhOther")}
                      onChange={(e) => updateCond(c.id, { label: e.target.value })}
                    />
                    <span className="muted">×</span>
                    <input
                      type="number"
                      min={1}
                      className="num-in"
                      value={c.target}
                      onChange={(e) => updateCond(c.id, { target: Number(e.target.value) })}
                    />
                    {remove}
                  </div>
                );
              })}
              <div className="add-conds">
                <button type="button" className="add-cond" onClick={() => setConds([...conds, newCond("count")])}>
                  {t("modal.addCondition")}
                </button>
                <button type="button" className="add-cond" onClick={() => setConds([...conds, newCond("pomodoro")])}>
                  {t("pomodoro.form.add")}
                </button>
              </div>
            </div>
          </div>

          <div className="row3">
            <label className="field">
              <span className="lbl">{t("modal.xp")}</span>
              <input type="number" min={0} step={10} value={xp} onChange={(e) => (setXp(Number(e.target.value)), setRewardTouched(true))} />
            </label>
            <label className="field">
              <span className="lbl">{t("modal.gold")}</span>
              <input type="number" min={0} step={10} value={gold} onChange={(e) => (setGold(Number(e.target.value)), setRewardTouched(true))} />
            </label>
            <label className="field">
              <span className="lbl">{t("items.quest.guaranteed")}</span>
              <GuaranteedItemSelect value={itemId} onChange={setItemId} />
            </label>
          </div>
          <LootHint category={category} />

          {category === "repeat" && (
            <label className="field">
              <span className="lbl">{t("modal.cooldown")}</span>
              <select value={cooldown} onChange={(e) => setCooldown(Number(e.target.value))}>
                {COOLDOWNS.map((o) => (
                  <option key={o.minutes} value={o.minutes}>
                    {cooldownLabel(o)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <footer className="modal-f">
          <span className="muted hint">
            <kbd>{MOD_KEY}</kbd>+<kbd>Enter</kbd> {t("modal.publish")} · <kbd>Esc</kbd> {t("modal.close")}
          </span>
          <button type="button" className="btn btn-ghost" onClick={close}>
            {t("modal.cancel")}
          </button>
          <button type="submit" className={`btn btn-primary ${valid ? "" : "is-disabled"}`} disabled={!valid}>
            {t("modal.submit")}
          </button>
        </footer>
      </motion.form>
    </motion.div>
  );
}

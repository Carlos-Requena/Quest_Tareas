import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import type { Category, ConditionDef, QuestDef, QuestState } from "../domain/types";
import { CATEGORY_META, isPomodoroCondition } from "../domain/types";
import { useGame } from "../store/game";
import { uid } from "../lib/id";
import { sfx } from "../lib/sfx";
import i18n from "../i18n";
import { DEFAULT_POMODORO, PomodoroConditionInputs, clampPlan } from "../features/pomodoro";
import { GuaranteedItemSelect, LootHint } from "../features/items";
import { RecurrenceField, RequiresField, recurs } from "../features/complex";
import { DeadlineField, useHorizonUi } from "../features/horizon";
import { areaSuggestions } from "../features/attributes";
import { ChecklistInputs, cleanChecklist, type ChecklistItem } from "../features/checklist";
import { BACKDROP_EXIT, MODAL_EXIT } from "../lib/motion";
import { RewardPreview, questReward } from "../features/rewards";
import { ContactsField, cleanContacts, type ContactRef } from "../features/contacts";
import { isChecklistCondition } from "../features/checklist";
import { saveQuestEdit } from "../features/editing/actions";
import { useEditingUi } from "../features/editing/ui";

/** Espera por defecto de una repetible: 20 h (diaria con margen). */
const DEFAULT_COOLDOWN = 20 * 60;

/** Tecla modificadora del atajo de publicar: ⌘ en macOS, Ctrl en Windows. */
const MOD_KEY = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";

interface CondDraft {
  id: string;
  kind: "count" | "pomodoro" | "checklist";
  label: string;
  /** Contador: cantidad. Pomodoro: rondas. Lista: lo calcula el número de casillas. */
  target: number;
  focusMinutes: number;
  breakMinutes: number;
  /** Casillas de una lista (features/checklist). */
  items: ChecklistItem[];
}

const newCond = (kind: CondDraft["kind"]): CondDraft => ({
  id: uid(),
  kind,
  label: "",
  target: 1,
  ...DEFAULT_POMODORO,
  items: kind === "checklist" ? [{ id: uid(), text: "" }] : [],
});

/** Un objetivo que ya existe, para editarlo (conserva su id: el progreso va por id). */
function condFrom(c: ConditionDef): CondDraft {
  if (isPomodoroCondition(c)) return { ...newCond("pomodoro"), id: c.id, label: c.label, target: c.target, focusMinutes: c.focusMinutes, breakMinutes: c.breakMinutes };
  if (isChecklistCondition(c)) return { ...newCond("checklist"), id: c.id, label: c.label, items: c.items.length ? c.items.map((it) => ({ ...it })) : [{ id: uid(), text: "" }] };
  return { ...newCond("count"), id: c.id, label: c.label, target: c.target };
}

const filledItems = (c: CondDraft) => c.items.filter((it) => it.text.trim() !== "");

const isUsable = (c: CondDraft) =>
  c.kind === "pomodoro" ||
  (c.kind === "checklist" ? c.label.trim() !== "" && filledItems(c).length > 0 : c.label.trim() !== "" && c.target > 0);

function toCondition(c: CondDraft): ConditionDef {
  if (c.kind === "count") return { id: c.id, kind: "count", label: c.label.trim(), target: Math.round(c.target) };
  if (c.kind === "checklist")
    return cleanChecklist({ id: c.id, kind: "checklist", label: c.label.trim(), target: 0, items: filledItems(c) });
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
  const creating = useGame((s) => s.creating);
  const setCreating = useGame((s) => s.setCreating);
  // Con datos de partida: el alta rápida («Más detalles») o una copia de una fallida (features/editing).
  const draft = useEditingUi((s) => s.draft);
  const close = () => {
    setCreating(false);
    useEditingUi.getState().setDraft(undefined);
  };
  return <AnimatePresence>{(creating || draft) && <QuestFormModal key={draft ? "draft" : "new"} initial={draft} onClose={close} />}</AnimatePresence>;
}

/**
 * Formulario completo de una quest. Sin `onCreate`, la publica en el Quest Board.
 * Con `onCreate` (desde un encargo temporal), la devuelve sin publicarla: el encargo
 * la crea al guardarse. `preset` rellena cliente y área, o la fecha límite (desde el calendario).
 * `initial` rellena todo (el alta rápida o una copia de una fallida); `edit` edita una que
 * ya existe (features/editing): en curso no se cambian los objetivos, la categoría ni la repetición.
 */
export function QuestFormModal({
  onClose,
  onCreate,
  preset,
  initial,
  edit,
}: {
  onClose(): void;
  onCreate?(quest: QuestDef): void;
  preset?: { client?: string; area?: string; dueAt?: number };
  initial?: Partial<QuestDef>;
  edit?: QuestState;
}) {
  const dispatch = useGame((s) => s.dispatch);
  const select = useGame((s) => s.select);
  const setTab = useGame((s) => s.setTab);
  const attrs = useGame((s) => s.state.player.attributes);
  const say = useGame((s) => s.say);
  const { t } = useTranslation();

  const src = edit ?? initial;
  const [title, setTitle] = useState(src?.title ?? "");
  const [category, setCategory] = useState<Category>(src?.category ?? "request");
  const [client, setClient] = useState(preset?.client ?? src?.client ?? "");
  const [area, setArea] = useState(preset?.area ?? src?.area ?? "");
  const [kind, setKind] = useState(src?.kind ?? "");
  const [description, setDescription] = useState(src?.description ?? "");
  const [conds, setConds] = useState<CondDraft[]>(() => (src?.conditions?.length ? src.conditions.map(condFrom) : [newCond("count")]));
  const [itemId, setItemId] = useState(src?.reward?.itemId ?? "");
  // Repetición (cualquier categoría, cada N o por días), requisitos y fecha límite: features/complex y features/horizon.
  const [cooldown, setCooldown] = useState<number | undefined>(src?.cooldownMinutes);
  const [repeatDays, setRepeatDays] = useState<number[] | undefined>(src?.repeatDays);
  const [cooldownTouched, setCooldownTouched] = useState(!!src);
  const [requires, setRequires] = useState<string[]>(src?.requires ?? []);
  const [dueAt, setDueAt] = useState<number | undefined>(preset?.dueAt ?? src?.dueAt);
  // A quién llamar o escribir, o dónde ir (features/contacts).
  const [contacts, setContacts] = useState<ContactRef[]>(src?.contacts ?? []);
  const recurring = recurs({ category, cooldownMinutes: cooldown, repeatDays });
  // En curso: los objetivos, la categoría y la repetición no se cambian (features/editing).
  const locked = edit?.status === "active";
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => titleRef.current?.focus(), []);

  const close = onClose;

  const valid = title.trim() && conds.some(isUsable);
  // XP y oro salen de los objetivos y la categoría (features/rewards): no se escriben a mano.
  const conditions = conds.filter(isUsable).map(toCondition);
  const reward = questReward({ category, conditions });
  const updateCond = (id: string, patch: Partial<CondDraft>) =>
    setConds(conds.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const submit = async () => {
    if (!valid) return;
    const quest: QuestDef = {
      id: edit?.id ?? uid(),
      title: title.trim(),
      category,
      client: client.trim(),
      area: area.trim(),
      kind: kind.trim(),
      description: description.trim(),
      conditions,
      reward: { ...reward, itemId: itemId || undefined },
      // Con días de la semana, mandan los días (features/complex).
      cooldownMinutes: repeatDays?.length ? undefined : category === "repeat" ? cooldown ?? DEFAULT_COOLDOWN : cooldown,
      repeatDays: repeatDays?.length ? repeatDays : undefined,
      requires: requires.length ? requires : undefined,
      // Las que se repiten no tienen fecha límite: tras la primera vuelta quedaría vencida.
      dueAt: recurring ? undefined : dueAt,
      contacts: cleanContacts(contacts).length ? cleanContacts(contacts) : undefined,
      createdAt: edit?.createdAt ?? Date.now(),
    };
    if (edit) {
      if (await saveQuestEdit(edit.id, quest)) close();
      return;
    }
    if (onCreate) {
      onCreate(quest);
      sfx.tick();
      close();
      return;
    }
    await dispatch({ type: "quest_created", quest });
    sfx.tick();
    setTab("all");
    // Que la quest nueva se vea aunque hubiera un plazo elegido en el filtro.
    useHorizonUi.getState().setFilter("board", "all");
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
    // La repetición sigue a la categoría hasta que se toca; una repetible siempre vuelve.
    if (!cooldownTouched) setCooldown(c === "repeat" ? DEFAULT_COOLDOWN : undefined);
    else if (c === "repeat" && cooldown === undefined) setCooldown(DEFAULT_COOLDOWN);
  };

  return (
    <motion.div
      className="modal-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={BACKDROP_EXIT}
      onMouseDown={(e) => e.target === e.currentTarget && close()}
      onKeyDown={onKey}
    >
      <motion.form
        className="modal"
        style={{ "--cat": CATEGORY_META[category].color } as React.CSSProperties}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98, transition: MODAL_EXIT }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        onSubmit={(e) => {
          e.preventDefault();
          // Dentro de un encargo va en un portal: que el envío no llegue al formulario del encargo.
          e.stopPropagation();
          submit();
        }}
      >
        <header className="modal-h">
          <span className="gem" />
          <span className="tag">{edit ? "Edit Posting" : "New Posting"}</span>
          <span className="sec-sub">{edit ? t("editing.subtitle") : t("modal.subtitle")}</span>
          <span className="sec-line" />
        </header>

        <div className="modal-body">
          <label className="field field-title">
            <span className="lbl">{t("modal.title")}</span>
            <input enterKeyHint="done" ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("modal.titlePh")} />
          </label>

          <div className="field">
            <span className="lbl">{t("modal.category")}</span>
            <div className="seg">
              {(Object.keys(CATEGORY_META) as Category[]).map((c) => (
                <button
                  type="button"
                  key={c}
                  disabled={locked}
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
              <input enterKeyHint="done" value={client} onChange={(e) => setClient(e.target.value)} placeholder={t("modal.clientPh")} />
            </label>
            <label className="field">
              <span className="lbl">{t("modal.area")}</span>
              <input enterKeyHint="done" value={area} onChange={(e) => setArea(e.target.value)} placeholder={t("modal.areaPh")} list="quest-areas" />
              <datalist id="quest-areas">
                {areaSuggestions(attrs, t).map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </label>
            <label className="field">
              <span className="lbl">{t("modal.kind")}</span>
              <input enterKeyHint="done" value={kind} onChange={(e) => setKind(e.target.value)} placeholder={t("modal.kindPh")} />
            </label>
          </div>

          <label className="field">
            <span className="lbl">{t("modal.description")}</span>
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("modal.descriptionPh")} />
          </label>

          <fieldset className="field cond-fieldset" disabled={locked}>
            <span className="lbl">{t("modal.conditions")}</span>
            {locked && <p className="rc-hint muted">{t("complex.recurrence.locked")}</p>}
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
                if (c.kind === "checklist") {
                  return (
                    <div key={c.id} className="cond-edit-pomo">
                      <div className="cond-edit-row is-pomo">
                        <span className="cond-edit-kind">☰ {t("checklist.kind")}</span>
                        <input enterKeyHint="done"
                          value={c.label}
                          placeholder={t("checklist.labelPh")}
                          onChange={(e) => updateCond(c.id, { label: e.target.value })}
                        />
                        {remove}
                      </div>
                      <ChecklistInputs items={c.items} onChange={(items) => updateCond(c.id, { items })} />
                    </div>
                  );
                }
                if (c.kind === "pomodoro") {
                  return (
                    <div key={c.id} className="cond-edit-pomo">
                      <div className="cond-edit-row is-pomo">
                        <span className="cond-edit-kind">◷ {t("pomodoro.kind")}</span>
                        <input enterKeyHint="done"
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
                    <input enterKeyHint="done"
                      value={c.label}
                      placeholder={i === 0 ? t("modal.conditionPh") : t("modal.conditionPhOther")}
                      onChange={(e) => updateCond(c.id, { label: e.target.value })}
                    />
                    <span className="muted">×</span>
                    <input enterKeyHint="done" inputMode="numeric"
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
                <button type="button" className="add-cond" onClick={() => setConds([...conds, newCond("checklist")])}>
                  {t("checklist.add")}
                </button>
              </div>
            </div>
          </fieldset>

          <div className="row-reward">
            <RewardPreview reward={reward} hint={t("rewards.quest")} />
            <label className="field">
              <span className="lbl">{t("items.quest.guaranteed")}</span>
              <GuaranteedItemSelect value={itemId} onChange={setItemId} />
            </label>
          </div>
          <LootHint category={category} />

          <RecurrenceField
            key={category === "repeat" ? "repeat" : "other"}
            category={category}
            value={cooldown}
            onChange={(v) => {
              setCooldown(v);
              setCooldownTouched(true);
            }}
            days={repeatDays}
            onDays={(d) => {
              setRepeatDays(d);
              setCooldownTouched(true);
              // Sin días, una repetible vuelve a su espera de siempre.
              if (!d && category === "repeat" && cooldown === undefined) setCooldown(DEFAULT_COOLDOWN);
            }}
            disabled={locked}
          />
          <DeadlineField value={dueAt} onChange={setDueAt} disabled={recurring} />
          <ContactsField value={contacts} onChange={setContacts} />
          <RequiresField value={requires} onChange={setRequires} forQuest={edit?.id} />
        </div>

        <footer className="modal-f">
          <span className="muted hint">
            <kbd>{MOD_KEY}</kbd>+<kbd>Enter</kbd> {edit ? t("editing.save") : t("modal.publish")} · <kbd>Esc</kbd> {t("modal.close")}
          </span>
          <button type="button" className="btn btn-ghost" onClick={close}>
            {t("modal.cancel")}
          </button>
          <button type="submit" className={`btn btn-primary ${valid ? "" : "is-disabled"}`} disabled={!valid}>
            {edit ? t("editing.submit") : t("modal.submit")}
          </button>
        </footer>
      </motion.form>
    </motion.div>
  );
}

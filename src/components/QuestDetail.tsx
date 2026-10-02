import { useEffect, useState } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { Trans, useTranslation } from "react-i18next";
import type { QuestState, QuestStatus } from "../domain/types";
import { CATEGORY_META } from "../domain/types";
import { conditionsMet, countConditionsMet } from "../domain/projection";
import { isPomodoroCondition } from "../domain/types";
import { PomodoroCondition } from "../features/pomodoro";
import { ChecklistCondition, isChecklistCondition } from "../features/checklist";
import { StreakInfo } from "../features/streaks";
import { QuestLoot } from "../features/items";
import { QuestRequirements, blockers, dependents, recurs } from "../features/complex";
import { QuestEventLink } from "../features/temporal";
import { dueDate, dueLabel, questDue } from "../features/horizon";
import { areaName } from "../features/attributes";
import { useGame } from "../store/game";
import { abandonQuest, addProgress } from "../store/actions";
import { detailPrimaryAction } from "../features/mobile";
import { formatRemaining } from "../lib/time";
import i18n, { num } from "../i18n";
import { GoldIcon } from "./Header";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};
const item: Variants = {
  hidden: { opacity: 0, x: 14 },
  show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 380, damping: 32 } },
};

function Section({ tag, label, children }: { tag: string; label: string; children: React.ReactNode }) {
  return (
    <motion.section variants={item} className="sec">
      <h3 className="sec-h">
        <span className="gem" />
        <span className="tag">{tag}</span>
        <span className="sec-sub">{label}</span>
        <span className="sec-line" />
      </h3>
      {children}
    </motion.section>
  );
}

export function QuestDetail({ quest, status, now }: { quest?: QuestState; status?: QuestStatus; now: number }) {
  const quests = useGame((s) => s.state.quests);
  const temporals = useGame((s) => s.state.temporals);
  const dispatch = useGame((s) => s.dispatch);
  const say = useGame((s) => s.say);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { t } = useTranslation();

  useEffect(() => setConfirmDelete(false), [quest?.id]);
  useEffect(() => {
    if (!confirmDelete) return;
    const timer = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmDelete]);

  if (!quest || !status) {
    return (
      <div className="detail detail-empty">
        <p>{t("detail.empty")}</p>
        <p className="muted">
          <Trans i18nKey="detail.emptyHint" components={{ kbd: <kbd /> }} />
        </p>
        {/* Los avisos (también los recordatorios de encargos) se ven aunque el tablón esté vacío. */}
        <Toast />
      </div>
    );
  }

  const meta = CATEGORY_META[quest.category];
  const active = status === "active";
  const met = conditionsMet(quest, now);
  // Quests complejas: requisitos que la bloquean y quests que desbloquea.
  const lock = status === "available" ? blockers(quest, quests) : [];
  const hasRules = !!quest.requires?.length || dependents(quest.id, quests.values()).length > 0;
  const due = questDue(quest, temporals);

  let primary: { label: string; enabled: boolean };
  if (active && met) primary = { label: t("actions.report"), enabled: true };
  else if (active)
    primary = { label: countConditionsMet(quest) ? t("pomodoro.pending") : t("actions.missing"), enabled: false };
  else if (status === "cooldown")
    primary = { label: t("actions.availableIn", { time: formatRemaining((quest.availableAt ?? 0) - now) }), enabled: false };
  else if (lock.length) primary = { label: t("complex.actions.locked"), enabled: false };
  else primary = { label: t("actions.accept"), enabled: true };

  return (
    <div className="detail" style={{ "--cat": meta.color } as React.CSSProperties}>
      <AnimatePresence mode="wait">
        <motion.div key={quest.id} className="detail-body" variants={container} initial="hidden" animate="show" exit="exit">
          <motion.div variants={item} className="detail-top">
            <span className="gem" style={{ color: meta.color }} />
            <span className="tag" style={{ color: meta.color }}>
              {quest.category === "repeat" ? "Repeatable" : quest.category === "elite" ? "Elite Hunt" : "Request"}
            </span>
            <span className="sec-sub">{t(`category.${quest.category}`)}</span>
            <span className="detail-meta-right muted">
              {recurs(quest)
                ? t("detail.reappears", { time: formatRemaining((quest.cooldownMinutes ?? 0) * 60_000) })
                : t("detail.once")}
              {quest.completions > 0 && t("detail.completedTimes", { n: quest.completions })}
              {due && (
                <span className={`detail-due ${due.temporal ? "" : "is-own"}`}>
                  {" · "}
                  {t("horizon.detail.deadline", { date: dueDate(due) })} ({dueLabel(due, now)})
                </span>
              )}
            </span>
          </motion.div>

          <motion.h2 variants={item} className="detail-title">
            {quest.title}
          </motion.h2>

          <motion.div variants={item} className="detail-meta">
            <div>
              <span className="lbl">{t("detail.client")}</span>
              <span>{quest.client || "—"}</span>
            </div>
            <div>
              <span className="lbl">{t("detail.area")}</span>
              <span>{areaName(quest.area, t) || "—"}</span>
            </div>
            <div>
              <span className="lbl">{t("detail.kind")}</span>
              <span>{quest.kind || "—"}</span>
            </div>
          </motion.div>

          {quest.description && (
            <Section tag="Request" label={t("detail.description")}>
              <p className="desc">{quest.description}</p>
            </Section>
          )}

          {quest.temporalId && (
            <Section tag="Timed Posting" label={t("temporal.quests.detail")}>
              <QuestEventLink quest={quest} />
            </Section>
          )}

          {hasRules && (
            <Section tag="Prerequisite" label={t("complex.detail.requires")}>
              <QuestRequirements quest={quest} />
            </Section>
          )}

          {recurs(quest) && (
            <Section tag="Streak" label={t("streaks.label")}>
              <StreakInfo quest={quest} now={now} />
            </Section>
          )}

          {quest.conditions.length > 0 && (
            <Section tag="Condition" label={t("detail.conditions")}>
              <div className="conds">
                {quest.conditions.map((c) => {
                  if (isPomodoroCondition(c)) return <PomodoroCondition key={c.id} quest={quest} cond={c} />;
                  if (isChecklistCondition(c)) return <ChecklistCondition key={c.id} quest={quest} cond={c} />;
                  const v = active ? quest.progress[c.id] ?? 0 : 0;
                  const done = v >= c.target;
                  return (
                    <div key={c.id} className={`cond ${done ? "done" : ""}`}>
                      <span className="cond-kind">{done ? "✓" : "✕"} {quest.kind || t("detail.objective")}</span>
                      <span className="cond-label">{c.label}</span>
                      <span className="cond-bar">
                        <motion.span
                          className="cond-fill"
                          animate={{ width: `${(v / c.target) * 100}%` }}
                          transition={{ type: "spring", stiffness: 260, damping: 30 }}
                        />
                      </span>
                      <span className="num cond-val">
                        {v} <small>/ {c.target}</small>
                      </span>
                      {active && (
                        <span className="cond-btns">
                          <button disabled={v <= 0} onClick={() => addProgress(quest.id, c.id, -1)} title={t("detail.remove")}>
                            −
                          </button>
                          <button disabled={done} onClick={() => addProgress(quest.id, c.id, 1)} title={t("detail.add")}>
                            +
                          </button>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          <Section tag="Reward" label={t("detail.reward")}>
            <div className="rewards">
              <span className="reward">
                <span className="reward-ico xp">XP</span>
                <b className="num">{num(quest.reward.xp)}</b>
              </span>
              <span className="reward">
                <GoldIcon />
                <b className="num">{num(quest.reward.gold)}</b>
                <small className="muted">G</small>
              </span>
              <QuestLoot quest={quest} />
            </div>
          </Section>
        </motion.div>
      </AnimatePresence>

      <div className="actions">
        <button
          className={`btn btn-primary ${primary.enabled ? "" : "is-disabled"} ${active && met ? "is-ready" : ""}`}
          disabled={!primary.enabled}
          onClick={() => detailPrimaryAction(quest.id)}
        >
          <span className="btn-key">A</span>
          {primary.label}
        </button>
        {active ? (
          <button className="btn btn-ghost btn-danger" onClick={() => abandonQuest(quest.id)}>
            <span className="btn-key">X</span>
            {t("actions.abandon")}
          </button>
        ) : (
          <button
            className={`btn btn-ghost ${confirmDelete ? "btn-danger" : ""}`}
            onClick={async () => {
              if (!confirmDelete) return setConfirmDelete(true);
              await dispatch({ type: "quest_deleted", questId: quest.id });
              say(() => i18n.t("toast.retired", { title: quest.title }));
            }}
          >
            {confirmDelete ? t("actions.retireConfirm") : t("actions.retire")}
          </button>
        )}
        <Toast />
      </div>
    </div>
  );
}

export function Toast() {
  const toast = useGame((s) => s.toast);
  useTranslation(); // vuelve a pintar el aviso al cambiar de idioma
  return (
    <AnimatePresence mode="wait">
      {toast && (
        <motion.span
          key={toast.key}
          className="toast"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {toast.text()}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

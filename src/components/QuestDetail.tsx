import { useEffect, useState } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import type { QuestState, QuestStatus } from "../domain/types";
import { CATEGORY_META } from "../domain/types";
import { conditionsMet } from "../domain/projection";
import { useGame } from "../store/game";
import { abandonQuest, addProgress, primaryAction } from "../store/actions";
import { formatRemaining } from "../lib/time";
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
  const maxActive = useGame((s) => s.state.player.maxActive);
  const activeCount = useGame((s) => [...s.state.quests.values()].filter((q) => q.status === "active").length);
  const dispatch = useGame((s) => s.dispatch);
  const say = useGame((s) => s.say);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => setConfirmDelete(false), [quest?.id]);
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  if (!quest || !status) {
    return (
      <div className="detail detail-empty">
        <p>El tablón está vacío.</p>
        <p className="muted">
          Pulsa <kbd>N</kbd> para publicar una nueva quest.
        </p>
      </div>
    );
  }

  const meta = CATEGORY_META[quest.category];
  const active = status === "active";
  const met = conditionsMet(quest);

  let primary: { label: string; enabled: boolean };
  if (active) primary = met ? { label: "Reportar", enabled: true } : { label: "Faltan objetivos", enabled: false };
  else if (status === "cooldown")
    primary = { label: `Disponible en ${formatRemaining((quest.availableAt ?? 0) - now)}`, enabled: false };
  else if (activeCount >= maxActive) primary = { label: "Sin huecos libres", enabled: false };
  else primary = { label: "Aceptar", enabled: true };

  return (
    <div className="detail" style={{ "--cat": meta.color } as React.CSSProperties}>
      <AnimatePresence mode="wait">
        <motion.div key={quest.id} className="detail-body" variants={container} initial="hidden" animate="show" exit="exit">
          <motion.div variants={item} className="detail-top">
            <span className="gem" style={{ color: meta.color }} />
            <span className="tag" style={{ color: meta.color }}>
              {quest.category === "repeat" ? "Repeatable" : quest.category === "elite" ? "Elite Hunt" : "Request"}
            </span>
            <span className="sec-sub">{meta.label}</span>
            <span className="detail-meta-right muted">
              {quest.category === "repeat"
                ? `Reaparece tras ${formatRemaining((quest.cooldownMinutes ?? 0) * 60_000)}`
                : "Una sola vez"}
              {quest.completions > 0 && ` · completada ×${quest.completions}`}
            </span>
          </motion.div>

          <motion.h2 variants={item} className="detail-title">
            {quest.title}
          </motion.h2>

          <motion.div variants={item} className="detail-meta">
            <div>
              <span className="lbl">Encargado por</span>
              <span>{quest.client || "—"}</span>
            </div>
            <div>
              <span className="lbl">Área</span>
              <span>{quest.area || "—"}</span>
            </div>
            <div>
              <span className="lbl">Tipo</span>
              <span>{quest.kind || "—"}</span>
            </div>
          </motion.div>

          {quest.description && (
            <Section tag="Request" label="Descripción">
              <p className="desc">{quest.description}</p>
            </Section>
          )}

          <Section tag="Condition" label="Objetivos">
            <div className="conds">
              {quest.conditions.map((c) => {
                const v = active ? quest.progress[c.id] ?? 0 : 0;
                const done = v >= c.target;
                return (
                  <div key={c.id} className={`cond ${done ? "done" : ""}`}>
                    <span className="cond-kind">{done ? "✓" : "✕"} {quest.kind || "Objetivo"}</span>
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
                        <button disabled={v <= 0} onClick={() => addProgress(quest.id, c.id, -1)} title="Quitar">
                          −
                        </button>
                        <button disabled={done} onClick={() => addProgress(quest.id, c.id, 1)} title="Añadir">
                          +
                        </button>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          <Section tag="Reward" label="Recompensa">
            <div className="rewards">
              <span className="reward">
                <span className="reward-ico xp">XP</span>
                <b className="num">{quest.reward.xp.toLocaleString("es-ES")}</b>
              </span>
              <span className="reward">
                <GoldIcon />
                <b className="num">{quest.reward.gold.toLocaleString("es-ES")}</b>
                <small className="muted">G</small>
              </span>
              {quest.reward.item && (
                <span className="reward">
                  <span className="reward-ico item">◈</span>
                  <span>{quest.reward.item}</span>
                  <small className="muted">×1</small>
                </span>
              )}
            </div>
          </Section>
        </motion.div>
      </AnimatePresence>

      <div className="actions">
        <button
          className={`btn btn-primary ${primary.enabled ? "" : "is-disabled"} ${active && met ? "is-ready" : ""}`}
          disabled={!primary.enabled}
          onClick={() => primaryAction(quest.id)}
        >
          <span className="btn-key">A</span>
          {primary.label}
        </button>
        {active ? (
          <button className="btn btn-ghost btn-danger" onClick={() => abandonQuest(quest.id)}>
            <span className="btn-key">X</span>
            Abandonar
          </button>
        ) : (
          <button
            className={`btn btn-ghost ${confirmDelete ? "btn-danger" : ""}`}
            onClick={async () => {
              if (!confirmDelete) return setConfirmDelete(true);
              await dispatch({ type: "quest_deleted", questId: quest.id });
              say(`«${quest.title}» retirada del tablón`);
            }}
          >
            {confirmDelete ? "¿Seguro? Retirar" : "Retirar del tablón"}
          </button>
        )}
        <Toast />
      </div>
    </div>
  );
}

function Toast() {
  const toast = useGame((s) => s.toast);
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
          「 {toast.text} 」
        </motion.span>
      )}
    </AnimatePresence>
  );
}

import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { CATEGORY_META } from "../../../domain/types";
import { useGame } from "../../../store/game";
import { sfx } from "../../../lib/sfx";
import { useNow } from "../../../lib/time";
import { TEMPORAL_LIMITS, linkCandidates } from "../model";
import { newQuestSeed, type QuestSeed, type TemporalDraft } from "../actions";
import { linkState } from "../links";
import { SwordIcon } from "./Poster";
import { QuestFormModal } from "../../../components/CreateQuestModal";
import { questValue } from "../../rewards/model";
import { num } from "../../../i18n";

/**
 * Quests del encargo en el formulario: las ya enlazadas (quitarlas no las borra del
 * Quest Board), quests nuevas hechas con el formulario completo del Quest Board,
 * quests rápidas (título ×N) y un desplegable para enlazar una quest que ya está en
 * el tablón. Las nuevas se crean al guardar. Opción «en cadena» para las nuevas.
 */
export function TemporalQuestsField({ d, set, editId }: { d: TemporalDraft; set(patch: Partial<TemporalDraft>): void; editId?: string }) {
  const quests = useGame((s) => s.state.quests);
  const since = useGame((s) => (editId ? s.state.temporals.get(editId)?.linkedAt : undefined));
  const now = useNow(60_000);
  const { t } = useTranslation();
  const linked = d.questIds.map((id) => quests.get(id)).filter((q) => !!q);
  const candidates = linkCandidates(quests.values(), editId).filter((q) => !d.questIds.includes(q.id));
  const [composing, setComposing] = useState(false);
  const total = d.questIds.length + d.fullQuests.length + d.newQuests.length;
  const room = total < TEMPORAL_LIMITS.quests;
  const setSeed = (key: string, patch: Partial<QuestSeed>) => set({ newQuests: d.newQuests.map((s) => (s.key === key ? { ...s, ...patch } : s)) });

  return (
    <div className="field">
      <span className="lbl">
        {t("temporal.quests.label")} <small className="num">{total} / {TEMPORAL_LIMITS.quests}</small>
      </span>
      <div className="tq-list">
        <AnimatePresence initial={false}>
          {linked.map((q, i) => {
            const st = linkState(q, since?.[q.id], quests, now);
            return (
              <motion.div
                key={q.id}
                className={`tq-row is-linked is-${st}`}
                style={{ "--cat": CATEGORY_META[q.category].color } as React.CSSProperties}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                <span className="tq-i num">{i + 1}</span>
                <span className="gem" />
                <span className="tq-title">{q.title}</span>
                <span className="tq-state">{t(`temporal.quests.status.${st}`)}</span>
                <button
                  type="button"
                  className="icon-btn"
                  title={t("temporal.quests.remove")}
                  onClick={() => {
                    sfx.paperRip(0.3);
                    set({ questIds: d.questIds.filter((x) => x !== q.id) });
                  }}
                >
                  ✕
                </button>
              </motion.div>
            );
          })}
          {d.fullQuests.map((q, j) => (
            <motion.div
              key={q.id}
              className="tq-row is-new is-full"
              style={{ "--cat": CATEGORY_META[q.category].color } as React.CSSProperties}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <span className="tq-i num">{linked.length + j + 1}</span>
              <span className="tq-new">{t("temporal.quests.isNew")}</span>
              <span className="gem" />
              <span className="tq-title">{q.title}</span>
              <span className="tq-state num">{t("temporal.quests.worth", { xp: num(questValue(q).xp) })}</span>
              <button
                type="button"
                className="icon-btn"
                title={t("temporal.quests.removeNew")}
                onClick={() => {
                  sfx.paperRip(0.3);
                  set({ fullQuests: d.fullQuests.filter((x) => x.id !== q.id) });
                }}
              >
                ✕
              </button>
            </motion.div>
          ))}
          {d.newQuests.map((s, j) => (
            <motion.div
              key={s.key}
              className="tq-row is-new"
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <span className="tq-i num">{linked.length + d.fullQuests.length + j + 1}</span>
              <span className="tq-new">{t("temporal.quests.isNew")}</span>
              <input enterKeyHint="done"
                autoFocus={!s.title}
                value={s.title}
                maxLength={TEMPORAL_LIMITS.title}
                placeholder={t("temporal.quests.newPh")}
                onChange={(e) => setSeed(s.key, { title: e.target.value })}
              />
              <span className="muted">×</span>
              <input enterKeyHint="done" inputMode="numeric"
                type="number"
                min={1}
                className="num-in"
                title={t("temporal.quests.times")}
                value={s.target}
                onChange={(e) => setSeed(s.key, { target: Number(e.target.value) })}
              />
              <button
                type="button"
                className="icon-btn"
                title={t("temporal.quests.removeNew")}
                onClick={() => {
                  sfx.paperRip(0.3);
                  set({ newQuests: d.newQuests.filter((x) => x.key !== s.key) });
                }}
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="tq-tools">
        <button
          type="button"
          className="add-cond"
          disabled={!room}
          onClick={() => {
            sfx.tick();
            set({ newQuests: [...d.newQuests, newQuestSeed()] });
          }}
        >
          <SwordIcon /> {t("temporal.quests.add")}
        </button>
        <button
          type="button"
          className="add-cond"
          disabled={!room}
          onClick={() => {
            sfx.tick();
            setComposing(true);
          }}
        >
          <SwordIcon /> {t("temporal.quests.addFull")}
        </button>
        {candidates.length > 0 && room && (
          <select
            className="tq-pick"
            value=""
            onChange={(e) => {
              if (!e.target.value) return;
              sfx.pin();
              set({ questIds: [...d.questIds, e.target.value] });
            }}
          >
            <option value="">{t("temporal.quests.link")}</option>
            {candidates.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title}
              </option>
            ))}
          </select>
        )}
      </div>
      {d.newQuests.length + d.fullQuests.length > 0 && (
        <label className="tf-check tq-chain">
          <input type="checkbox" checked={d.chain} onChange={(e) => set({ chain: e.target.checked })} />
          {t("temporal.quests.chain")}
        </label>
      )}
      <p className="tf-hint muted">{t("temporal.quests.hint")}</p>
      {/* En un portal: un <form> no puede ir dentro del formulario del encargo. */}
      {createPortal(
        <AnimatePresence>
          {composing && (
            <QuestFormModal
              preset={{ client: d.title.trim(), area: d.place.trim() }}
              onClose={() => setComposing(false)}
              onCreate={(q) => set({ fullQuests: [...d.fullQuests, q] })}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

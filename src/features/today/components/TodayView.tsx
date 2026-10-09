import { memo, useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { CATEGORY_META, type QuestState } from "../../../domain/types";
import { conditionProgress } from "../../../domain/projection";
import { acceptQuest } from "../../../store/actions";
import { formatRemaining } from "../../../lib/time";
import { LANGS, currentLang, num } from "../../../i18n";
import { formatClock, keyMs } from "../../agenda/model";
import { goToQuest, goToTemporal } from "../../temporal/actions";
import { Skull } from "../../temporal/components/Skull";
import { isAccepted, type TemporalState } from "../../temporal/model";
import { openCalendarItem, setCalendarView } from "../../calendar/actions";
import { itemColor } from "../../calendar/components/CalendarChip";
import { minuteOf, type CalendarItem } from "../../calendar/model";
import { liveStreak } from "../../streaks/model";
import { CompanionBox } from "../../companion";
import { isQuietDay, todayPlan } from "../model";
import "../today.css";

/**
 * «Mi día»: qué hacer ahora, en orden de urgencia. Es una vista del calendario (features/calendar):
 * lo que se pierde esta noche, lo que está en curso, las rachas en peligro, lo que toca hoy y,
 * al lado, la agenda de hoy, los próximos días y lo que ya has hecho.
 */
export function TodayView({ now }: { now: number }) {
  const { t } = useTranslation();
  const quests = useGame((s) => s.state.quests);
  const temporals = useGame((s) => s.state.temporals);
  const agenda = useGame((s) => s.state.agenda);
  const chronicle = useGame((s) => s.state.chronicle);
  const plan = useMemo(() => todayPlan({ quests, temporals, agenda: agenda.values(), chronicle }, now), [quests, temporals, agenda, chronicle, now]);
  const locale = LANGS[currentLang()].locale;
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "short" });
  const quiet = isQuietDay(plan);
  const tonight = plan.tonight.quests.length + plan.tonight.temporals.length;

  return (
    <div className="td">
      <div className="td-main">
        <CompanionBox plan={plan} now={now} />
        {quiet && (
          <p className="td-quiet">
            <span className="gem" />
            {t("today.quiet")}
          </p>
        )}

        {tonight > 0 && (
          <Block tag="Last Day" label={t("today.tonight", { time: formatRemaining(plan.endsAt - now) })} tone="danger">
            {plan.tonight.temporals.map((x) => (
              <TemporalRow key={x.id} t={x} />
            ))}
            {plan.tonight.quests.map((q) => (
              <QuestRow key={q.id} q={q} now={now} />
            ))}
          </Block>
        )}

        {plan.active.length > 0 && (
          <Block tag="In Progress" label={t("today.active")}>
            {plan.active.map((q) => (
              <QuestRow key={q.id} q={q} now={now} />
            ))}
          </Block>
        )}

        {plan.streaks.length > 0 && (
          <Block tag="Streak" label={t("today.streaks")} tone="fire">
            {plan.streaks.map((q) => (
              <QuestRow key={q.id} q={q} now={now} meta={t("today.streakLeft", { n: liveStreak(q.streak, now), time: formatRemaining((q.streak?.until ?? now) - now) })} accept />
            ))}
          </Block>
        )}

        {plan.due.length > 0 && (
          <Block tag="Today" label={t("today.due")}>
            {plan.due.map((q) => (
              <QuestRow key={q.id} q={q} now={now} meta={q.repeatDays?.length ? t("today.weekly") : t("today.back")} accept />
            ))}
          </Block>
        )}

        {plan.stale.quests.length + plan.stale.temporals.length > 0 && (
          <Block tag="Overdue" label={t("today.stale")} hint={t("today.staleHint")}>
            {plan.stale.temporals.map((x) => (
              <TemporalRow key={x.id} t={x} />
            ))}
            {plan.stale.quests.map((q) => (
              <QuestRow key={q.id} q={q} now={now} />
            ))}
          </Block>
        )}
      </div>

      <aside className="td-side">
        <Block tag="Agenda" label={t("today.agenda")}>
          {plan.agenda.allDay.length + plan.agenda.timed.length === 0 && <p className="td-empty muted">{t("today.agendaEmpty")}</p>}
          {plan.agenda.allDay.map((item) => (
            <button key={`${item.kind}:${item.id}`} className={`td-slot is-allday ${slotDone(item) ? "is-past" : ""}`} style={{ "--c": itemColor(item) } as React.CSSProperties} onClick={() => openCalendarItem(item, plan.date)}>
              <span className="td-slot-time muted">{t("today.allDay")}</span>
              <span className="td-slot-title">{item.title}</span>
            </button>
          ))}
          {plan.agenda.timed.map((item) => {
            const start = keyMs(plan.date) + item.start * 60_000;
            const end = keyMs(plan.date) + item.end * 60_000;
            const state = now >= end || slotDone(item) ? "is-past" : now >= start ? "is-now" : "";
            return (
              <button key={`${item.kind}:${item.id}:${item.start}`} className={`td-slot ${state}`} style={{ "--c": itemColor(item) } as React.CSSProperties} onClick={() => openCalendarItem(item, plan.date)}>
                <span className="td-slot-time num">
                  {formatClock(item.start)}
                  {item.kind === "agenda" && `–${formatClock(item.end)}`}
                </span>
                <span className="td-slot-title">{item.title}</span>
                {state === "is-now" && <span className="td-now">{t("today.now")}</span>}
              </button>
            );
          })}
        </Block>

        <Block tag="Next" label={t("today.next")}>
          {plan.next.map((d, i) => (
            <button
              key={d.date}
              className="td-next"
              onClick={() => openDay(d.date)}
            >
              <span className="td-next-day">{i === 0 ? t("today.tomorrow") : weekday.format(keyMs(d.date))}</span>
              <span className="td-next-counts muted">
                {d.quests + d.temporals + d.blocks === 0
                  ? t("today.nothing")
                  : [d.temporals && t("today.count.temporals", { count: d.temporals }), d.quests && t("today.count.quests", { count: d.quests }), d.blocks && t("today.count.blocks", { count: d.blocks })]
                      .filter(Boolean)
                      .join(" · ")}
              </span>
            </button>
          ))}
        </Block>

        <Block tag="Done" label={t("today.done")}>
          <p className="td-done">
            {plan.done.quests + plan.done.temporals === 0 ? (
              <span className="muted">{t("today.doneNone")}</span>
            ) : (
              <>
                <span>{[plan.done.quests && t("today.count.quests", { count: plan.done.quests }), plan.done.temporals && t("today.count.temporals", { count: plan.done.temporals })].filter(Boolean).join(" · ")}</span>
                <b className="num td-xp">+{num(plan.done.xp)} XP</b>
                <b className="num td-gold">+{num(plan.done.gold)} G</b>
              </>
            )}
            {plan.done.failed > 0 && <span className="td-failed">{t("today.failed", { count: plan.done.failed })}</span>}
          </p>
        </Block>
      </aside>
    </div>
  );
}

/** Ya terminado: un encargo cumplido o quemado, una quest hecha ese día o fracturada. */
const slotDone = (item: CalendarItem) => (item.kind === "temporal" && item.done) || (item.kind === "quest" && (item.done || item.failed));

/** Lleva al día por horas de esa fecha. */
function openDay(date: string) {
  setCalendarView("day", date);
}

function Block({ tag, label, hint, tone, children }: { tag: string; label: string; hint?: string; tone?: "danger" | "fire"; children: ReactNode }) {
  return (
    <section className={`td-block ${tone ? `is-${tone}` : ""}`}>
      <h3 className="sec-h">
        <span className="gem" />
        <span className="tag">{tag}</span>
        <span className="sec-sub">{label}</span>
        <span className="sec-line" />
      </h3>
      {hint && <p className="td-hint muted">{hint}</p>}
      <div className="td-rows">{children}</div>
    </section>
  );
}

// Las filas van con memo: al cambiar una quest, solo se vuelve a pintar la suya.
const QuestRow = memo(function QuestRow({ q, now, meta, accept }: { q: QuestState; now: number; meta?: string; accept?: boolean }) {
  const { t } = useTranslation();
  const total = q.conditions.length;
  const met = q.status === "active" ? q.conditions.filter((c) => conditionProgress(q, c, now) >= c.target).length : 0;
  return (
    <div className={`td-row is-quest ${q.status === "active" ? "is-active" : ""}`} style={{ "--c": CATEGORY_META[q.category].color } as React.CSSProperties}>
      <button className="td-row-main" onClick={() => goToQuest(q.id)}>
        <span className="gem" />
        <span className="td-row-title">{q.title}</span>
        <span className="td-row-meta muted">{meta ?? (q.status === "active" ? t("today.progress", { met, total }) : t(`category.${q.category}`))}</span>
      </button>
      {accept && q.status !== "active" && (
        <button className="td-accept" onClick={() => acceptQuest(q.id)}>
          {t("actions.accept")}
        </button>
      )}
    </div>
  );
});

const TemporalRow = memo(function TemporalRow({ t: x }: { t: TemporalState }) {
  const { t } = useTranslation();
  const time = x.allDay ? t("today.allDay") : formatClock(minuteOf(x.dueAt));
  return (
    <div className={`td-row is-temporal ${isAccepted(x) ? "" : "is-planned"}`}>
      <button className="td-row-main" onClick={() => goToTemporal(x.id)}>
        <Skull />
        <span className="td-row-title">{x.title}</span>
        <span className="td-row-meta muted">{isAccepted(x) ? time : `${time} · ${t("calendar.item.planned")}`}</span>
      </button>
    </div>
  );
});

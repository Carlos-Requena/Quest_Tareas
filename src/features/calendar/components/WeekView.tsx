import { useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { sfx } from "../../../lib/sfx";
import { LANGS, currentLang } from "../../../i18n";
import { keyMs, weekDays, weekStart } from "../../agenda/model";
import { calendarDay } from "../model";
import { setCalendarView } from "../actions";
import { useCalendarUi } from "../ui";
import { CalendarChip } from "./CalendarChip";
import { AddMenu } from "./AddMenu";

/**
 * La semana de lunes a domingo: en cada día, lo de todo el día (encargos y quests con
 * fecha límite) y lo que tiene hora (bloques de la agenda y encargos con hora).
 */
export function WeekView({ today }: { today: string }) {
  const { t } = useTranslation();
  const day = useCalendarUi((s) => s.day);
  const adding = useCalendarUi((s) => s.adding);
  const quests = useGame((s) => s.state.quests);
  const temporals = useGame((s) => s.state.temporals);
  const agenda = useGame((s) => s.state.agenda);
  const locale = LANGS[currentLang()].locale;
  const monday = weekStart(day);

  const days = useMemo(
    () => weekDays(monday).map((k) => calendarDay(k, { quests: quests.values(), temporals: temporals.values(), agenda: agenda.values(), today })),
    [monday, quests, temporals, agenda, today],
  );
  const wd = new Intl.DateTimeFormat(locale, { weekday: "short" });

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={monday}
        className="cal-week"
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
      >
        {days.map((d) => {
          const empty = !d.allDay.length && !d.timed.length;
          return (
            <section
              key={d.date}
              className={`cal-col ${d.date === today ? "is-today" : ""} ${d.date === day ? "is-selected" : ""} ${d.date < today ? "is-past" : ""}`}
              onClick={() => {
                if (d.date === day) return;
                sfx.move();
                useCalendarUi.getState().setDay(d.date);
              }}
            >
              <header className="cal-col-h">
                <button
                  className="cal-date"
                  title={t("calendar.openDay")}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCalendarView("day", d.date);
                  }}
                >
                  <span className="cal-wd">{wd.format(keyMs(d.date))}</span>
                  <span className="cal-dn num">{Number(d.date.slice(8))}</span>
                </button>
                <button
                  className={`cal-add ${adding === d.date ? "on" : ""}`}
                  aria-label={t("calendar.add")}
                  title={t("calendar.add")}
                  onClick={(e) => {
                    e.stopPropagation();
                    sfx.move();
                    useCalendarUi.getState().setAdding(adding === d.date ? undefined : d.date);
                  }}
                >
                  +
                </button>
                {adding === d.date && <AddMenu date={d.date} />}
              </header>
              <div className="cal-items">
                {d.allDay.map((i) => (
                  <CalendarChip key={`${i.kind}:${i.id}`} item={i} date={d.date} />
                ))}
                {d.allDay.length > 0 && d.timed.length > 0 && <span className="cal-sep" />}
                {d.timed.map((i) => (
                  <CalendarChip key={`${i.kind}:${i.id}`} item={i} date={d.date} />
                ))}
                {empty && <span className="cal-free">{t("calendar.nothing")}</span>}
              </div>
            </section>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
}

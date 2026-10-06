import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { useNow } from "../../../lib/time";
import { LANGS, currentLang } from "../../../i18n";
import { QuestFormModal } from "../../../components/CreateQuestModal";
import { Toast } from "../../../components/QuestDetail";
import { addDays, dateKey, keyMs, weekStart } from "../../agenda/model";
import { temporalBusy } from "../../temporal/ui";
import { merchantBusy } from "../../merchant/ui";
import { characterBusy } from "../../equipment/ui";
import { chronicleBusy } from "../../chronicle/ui";
import { useSwipe } from "../../mobile/swipe";
import { editingBusy } from "../../editing/ui";
import { failureBusy } from "../../failure/ui";
import { searchBusy } from "../../search/ui";
import { addBlock, cycleCalendarView, goToday, moveCalendar, setCalendarView } from "../actions";
import { CALENDAR_VIEWS, calendarBusy, useCalendarUi } from "../ui";
import { TodayView } from "../../today/components/TodayView";
import { WeekView } from "./WeekView";
import { DayView } from "./DayView";
import "../calendar.css";

/**
 * La sección del calendario, donde se planifica: «Mi día» (qué hacer ahora, features/today),
 * la semana (lo que hay que hacer) o el día por horas (la agenda).
 */
export function CalendarView() {
  const { t } = useTranslation();
  const view = useCalendarUi((s) => s.view);
  const day = useCalendarUi((s) => s.day);
  const questFor = useCalendarUi((s) => s.questFor);
  const now = useNow(60_000);
  const today = dateKey(now);
  const locale = LANGS[currentLang()].locale;
  // En el teléfono, deslizar el dedo pasa de semana (o de día).
  const swipe = useSwipe((dir) => moveCalendar(dir));

  const monday = weekStart(day);
  const sunday = addDays(monday, 6);
  const short = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const title =
    view === "week"
      ? `${short.format(keyMs(monday))} – ${new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(keyMs(sunday))}`
      : new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(keyMs(view === "today" ? today : day));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const g = useGame.getState();
      if (g.creating || g.clear || g.collection || temporalBusy() || merchantBusy() || characterBusy() || chronicleBusy() || calendarBusy() || editingBusy() || failureBusy() || searchBusy() || e.metaKey || e.ctrlKey) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const ui = useCalendarUi.getState();
      switch (e.key) {
        case "ArrowLeft": moveCalendar(-1); break;
        case "ArrowRight": moveCalendar(1); break;
        case "v": cycleCalendarView(); break;
        case "h": case "Home": goToday(); break;
        case "n": addBlock(ui.day); break;
        case "Escape": ui.setAdding(undefined); break;
        default: return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <motion.section
      className={`cal cal-is-${view}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
    >
      <header className="cal-head">
        <div className="seg cal-views" role="tablist" aria-label={t("calendar.view.switch")}>
          {CALENDAR_VIEWS.map((v) => (
            <button key={v} role="tab" aria-selected={view === v} className={`seg-btn ${view === v ? "on" : ""}`} title={`${t(`calendar.view.${v}`)} (V)`} onClick={() => setCalendarView(v)}>
              {t(`calendar.view.${v}`)}
            </button>
          ))}
        </div>
        <div className={`cal-nav ${view === "today" ? "is-hidden" : ""}`}>
          <button className="cal-nav-btn" aria-label={t(view === "week" ? "calendar.prevWeek" : "calendar.prevDay")} title={t(view === "week" ? "calendar.prevWeek" : "calendar.prevDay")} onClick={() => moveCalendar(-1)}>
            ‹
          </button>
          <button className={`cal-today ${view === "week" ? (weekStart(today) === monday ? "on" : "") : day === today ? "on" : ""}`} onClick={goToday}>
            {t("calendar.today")}
          </button>
          <button className="cal-nav-btn" aria-label={t(view === "week" ? "calendar.nextWeek" : "calendar.nextDay")} title={t(view === "week" ? "calendar.nextWeek" : "calendar.nextDay")} onClick={() => moveCalendar(1)}>
            ›
          </button>
        </div>
        <h2 className="cal-title">{title}</h2>
      </header>

      <div className="cal-body m-swipe" {...swipe}>
        {view === "today" ? <TodayView now={now} /> : view === "week" ? <WeekView today={today} /> : <DayView today={today} now={now} />}
      </div>

      {/* Los avisos (bloque añadido, quitado…) abajo; en el teléfono los pinta la barra (m-toast). */}
      <div className="cal-toast">
        <Toast />
      </div>

      {/* Quest con fecha límite en el día elegido: el formulario completo del Quest Board. */}
      <AnimatePresence>
        {questFor && <QuestFormModal key={questFor} onClose={() => useCalendarUi.getState().setQuestFor(undefined)} preset={{ dueAt: keyMs(questFor) }} />}
      </AnimatePresence>
    </motion.section>
  );
}

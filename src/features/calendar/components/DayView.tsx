import { useLayoutEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { DAY_MINUTES, formatClock } from "../../agenda/model";
import { calendarDay, layoutDay, minuteOf } from "../model";
import { addBlock, openCalendarItem } from "../actions";
import { useCalendarUi } from "../ui";
import { CalendarChip, itemColor } from "./CalendarChip";
import { Skull } from "../../temporal/components/Skull";

/** Píxeles por minuto de la rejilla: 48 por hora. */
const PX = 0.8;
const HOURS = Array.from({ length: 24 }, (_, h) => h);

/**
 * El día por horas (la agenda personal): arriba lo de todo el día; debajo, la rejilla con
 * los bloques de la agenda y los encargos con hora. Pulsar en una hora libre añade un bloque.
 */
export function DayView({ today, now }: { today: string; now: number }) {
  const { t } = useTranslation();
  const day = useCalendarUi((s) => s.day);
  const quests = useGame((s) => s.state.quests);
  const temporals = useGame((s) => s.state.temporals);
  const agenda = useGame((s) => s.state.agenda);
  const scroll = useRef<HTMLDivElement>(null);
  const data = useMemo(() => calendarDay(day, { quests: quests.values(), temporals: temporals.values(), agenda: agenda.values() }), [day, quests, temporals, agenda]);
  const slots = useMemo(() => layoutDay(data.timed.map((i) => ({ key: `${i.kind}:${i.id}`, start: i.start, end: i.end }))), [data]);
  const isToday = day === today;

  // Al cambiar de día, la rejilla se coloca en la hora actual (hoy) o en la mañana.
  useLayoutEffect(() => {
    const first = data.timed[0]?.start;
    const at = isToday ? minuteOf(now) - 90 : Math.min(first ?? 8 * 60, 8 * 60) - 30;
    scroll.current?.scrollTo({ top: Math.max(0, at * PX) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  return (
    <div className="cal-dayview">
      <div className="cal-allday">
        <span className="cal-allday-lbl">{t("calendar.allDay")}</span>
        <div className="cal-allday-items">
          {data.allDay.length ? data.allDay.map((i) => <CalendarChip key={`${i.kind}:${i.id}`} item={i} date={day} />) : <span className="cal-free">—</span>}
        </div>
      </div>
      <div className="cal-scroll" ref={scroll}>
        <div
          className="cal-grid"
          style={{ height: DAY_MINUTES * PX }}
          title={t("calendar.gridHint")}
          onClick={(e) => {
            if (e.target !== e.currentTarget) return;
            const minute = Math.floor(e.nativeEvent.offsetY / PX / 30) * 30;
            addBlock(day, Math.max(0, Math.min(DAY_MINUTES - 60, minute)));
          }}
        >
          {HOURS.map((h) => (
            <div key={h} className="cal-hour" style={{ top: h * 60 * PX }}>
              <span className="num">{formatClock(h * 60)}</span>
            </div>
          ))}
          {data.timed.map((i) => {
            const s = slots.get(`${i.kind}:${i.id}`) ?? { col: 0, cols: 1 };
            const height = Math.max(22, (i.end - i.start) * PX - 2);
            return (
              <button
                key={`${i.kind}:${i.id}`}
                className={`cal-block is-${i.kind} ${height < 40 ? "is-short" : ""} ${i.kind === "temporal" && !i.accepted ? "is-planned" : ""}`}
                style={
                  {
                    top: i.start * PX + 1,
                    height,
                    left: `calc(var(--cal-gutter) + (100% - var(--cal-gutter) - 6px) * ${s.col / s.cols})`,
                    width: `calc((100% - var(--cal-gutter) - 6px) / ${s.cols} - 4px)`,
                    "--c": itemColor(i),
                  } as React.CSSProperties
                }
                onClick={() => openCalendarItem(i, day)}
              >
                <span className="cal-time num">
                  {i.kind === "temporal" && <Skull />}
                  {formatClock(i.start)}
                  {i.kind === "agenda" && `–${formatClock(i.end)}`}
                  {i.kind === "agenda" && i.repeats && " ↻"}
                </span>
                <b className="cal-block-title">{i.title}</b>
              </button>
            );
          })}
          {isToday && <div className="cal-now" style={{ top: minuteOf(now) * PX }} />}
        </div>
      </div>
    </div>
  );
}

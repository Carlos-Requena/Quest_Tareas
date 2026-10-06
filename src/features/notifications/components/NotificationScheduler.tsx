import { useEffect, useMemo, useState } from "react";
import { useGame } from "../../../store/game";
import { useNow } from "../../../lib/time";
import { sfx } from "../../../lib/sfx";
import i18n from "../../../i18n";
import { planReminders, type ReminderKind } from "../model";
import { isIOS, notifyEnabled, onNotifyChange, reminderText, schedulePlan, showNow, unscheduleAll } from "../service";

/** Los avisos que ya salían dentro de la app (PomodoroWatcher, TemporalWatcher): con la ventana delante no se repiten. */
const ALREADY_IN_APP: ReadonlySet<ReminderKind> = new Set(["pomodoro", "temporal"]);

/**
 * Calcula los avisos de los próximos días y los entrega: en iOS los programa en el sistema;
 * en el escritorio espera al siguiente con un temporizador. No pinta nada.
 */
export function NotificationScheduler() {
  const ready = useGame((s) => s.ready);
  const quests = useGame((s) => s.state.quests);
  const temporals = useGame((s) => s.state.temporals);
  const agenda = useGame((s) => s.state.agenda);
  const [on, setOn] = useState(notifyEnabled);
  // Lo ya entregado en esta sesión (escritorio): no se repite aunque el plan se recalcule.
  const [delivered, setDelivered] = useState<ReadonlySet<string>>(() => new Set());
  // Cada 5 minutos el horizonte avanza y entra lo que se acerca.
  const tick = useNow(5 * 60_000);

  useEffect(() => onNotifyChange(setOn), []);

  const plan = useMemo(
    () => (ready && on ? planReminders({ quests: quests.values(), temporals: temporals.values(), agenda: agenda.values() }, Date.now()) : []),
    // `tick` mueve el horizonte aunque no cambie nada más.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, on, quests, temporals, agenda, tick],
  );

  // iPhone: programados en el sistema (avisan aunque la app esté cerrada).
  useEffect(() => {
    if (!isIOS()) return;
    if (!on) void unscheduleAll();
    else if (ready) void schedulePlan(plan);
  }, [plan, on, ready]);

  // El idioma cambia los textos ya programados.
  useEffect(() => {
    if (!isIOS()) return;
    const fn = () => void (on && schedulePlan(plan));
    i18n.on("languageChanged", fn);
    return () => i18n.off("languageChanged", fn);
  }, [plan, on]);

  // Escritorio y navegador: un temporizador hasta el siguiente aviso que falte por dar.
  const next = useMemo(() => plan.find((r) => !delivered.has(r.key)), [plan, delivered]);
  useEffect(() => {
    if (isIOS() || !on || !next) return;
    const timer = setTimeout(
      () => {
        const focused = document.hasFocus() && !document.hidden;
        if (!focused) void showNow(next);
        else if (!ALREADY_IN_APP.has(next.kind)) {
          // Con la ventana delante, el aviso de siempre (los de pomodoro y encargos ya salen solos).
          sfx.bell();
          const { title, body } = reminderText(next);
          useGame.getState().say(() => `${title} · ${body}`);
        }
        setDelivered((d) => new Set(d).add(next.key));
      },
      // El plan solo llega a dos días: cabe en un setTimeout.
      Math.max(0, next.at - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [next, on]);

  return null;
}

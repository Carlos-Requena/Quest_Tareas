import { useEffect } from "react";
import { useGame } from "../../../store/game";
import { useNow } from "../../../lib/time";
import { checkFailures, noticeFailures } from "../actions";

/**
 * Vigila los plazos: al arrancar y cada minuto emite los fallos que tocan (lo que acabó su
 * día sin terminarse) y pone en la cola de animaciones los que aún no se han visto en este
 * equipo, también los que llegan de otro. No pinta nada.
 */
export function FailureWatcher() {
  const ready = useGame((s) => s.ready);
  const quests = useGame((s) => s.state.quests);
  const temporals = useGame((s) => s.state.temporals);
  const now = useNow(60_000);

  useEffect(() => {
    if (ready) void checkFailures(now);
  }, [ready, now]);

  useEffect(() => {
    if (ready) noticeFailures();
  }, [ready, quests, temporals]);

  return null;
}

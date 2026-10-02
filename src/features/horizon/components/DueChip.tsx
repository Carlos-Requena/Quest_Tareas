import { horizonOf, isOverdue, type Due } from "../model";
import { dueDate, dueLabel } from "../format";
import "../horizon.css";

/** Plazo de una quest en su tarjeta: color según lo que falta y, si viene de un encargo, su icono. */
export function DueChip({ due, now, icon }: { due: Due; now: number; icon?: React.ReactNode }) {
  const h = horizonOf(due, now);
  return (
    <span className={`due-chip hz-${h} ${isOverdue(due, now) ? "is-overdue" : ""}`} title={dueDate(due)}>
      {icon}
      {dueLabel(due, now)}
    </span>
  );
}

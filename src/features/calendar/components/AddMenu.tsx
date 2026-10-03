import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Skull } from "../../temporal/components/Skull";
import { addBlock, addQuest, addTemporal } from "../actions";
import { useCalendarUi } from "../ui";
import { CalendarIcon } from "./CalendarIcon";

/** Menú «+» de un día: un bloque en la agenda, una quest con esa fecha límite o un encargo ese día. */
export function AddMenu({ date }: { date: string }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  // Se cierra al pulsar fuera.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) && !(e.target as Element).closest?.(".cal-add")) useCalendarUi.getState().setAdding(undefined);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <motion.div
      ref={ref}
      className="cal-menu"
      role="menu"
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.16 }}
    >
      <button role="menuitem" onClick={() => addBlock(date)}>
        <CalendarIcon />
        {t("calendar.addBlock")}
      </button>
      <button role="menuitem" onClick={() => addQuest(date)}>
        <span className="gem" />
        {t("calendar.addQuest")}
      </button>
      <button role="menuitem" onClick={() => addTemporal(date)}>
        <Skull />
        {t("calendar.addTemporal")}
      </button>
    </motion.div>
  );
}

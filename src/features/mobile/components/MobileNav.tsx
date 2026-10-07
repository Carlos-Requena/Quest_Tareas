import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { useNow } from "../../../lib/time";
import { sfx } from "../../../lib/sfx";
import { Skull, needsAttention, switchSection, useTemporalUi } from "../../temporal";
import { CalendarIcon, addBlock, useCalendarUi } from "../../calendar";
import { MenuIcon, toggleMenu, useMenuUi } from "../../menu";
import { useMobileUi } from "../ui";
import { useQuickUi } from "../../quickadd/ui";
import "../mobile.css";

/**
 * Barra de abajo del teléfono, en lugar del pie con las teclas: los dos tablones, el calendario
 * y el menú de opciones (features/menu), donde están el mercader, el personaje, los objetos, la
 * crónica y los ajustes. En el escritorio no se ve (CSS).
 */
export function MobileNav() {
  const section = useGame((s) => s.section);
  const temporals = useGame((s) => s.state.temporals);
  const menu = useMenuUi((s) => s.open);
  const now = useNow(60_000);
  const { t } = useTranslation();
  const urgent = useMemo(() => needsAttention(temporals.values(), now), [temporals, now]);

  const go = (target: "board" | "temporal" | "calendar") => {
    useMobileUi.getState().closeDetail();
    useMenuUi.getState().setOpen(false);
    if (target === section) sfx.move();
    else switchSection(target);
  };

  return (
    <nav className="mnav" aria-label={t("mobile.nav.label")}>
      <NavButton on={section === "board" && !menu} label={t("mobile.nav.board")} onClick={() => go("board")} icon={<span className="gem" />} />
      <NavButton
        on={section === "temporal" && !menu}
        label={t("mobile.nav.temporal")}
        onClick={() => go("temporal")}
        icon={<Skull />}
        badge={urgent > 0 ? urgent : undefined}
      />
      <NavButton on={section === "calendar" && !menu} label={t("calendar.title")} onClick={() => go("calendar")} icon={<CalendarIcon />} />
      <NavButton on={menu} label={t("menu.open")} onClick={toggleMenu} icon={<MenuIcon />} />
    </nav>
  );
}

function NavButton({ on, label, icon, badge, onClick }: { on?: boolean; label: string; icon: ReactNode; badge?: number; onClick: () => void }) {
  return (
    <button className={`mnav-btn ${on ? "on" : ""}`} aria-current={on ? "page" : undefined} onClick={onClick}>
      <span className="mnav-ico">
        {icon}
        {badge !== undefined && <span className="mnav-badge num">{badge}</span>}
      </span>
      <span className="mnav-lbl">{label}</span>
    </button>
  );
}

/** Botón flotante para crear: una quest en el tablón o un encargo en el de encargos. */
export function MobileCreate() {
  const section = useGame((s) => s.section);
  const detail = useMobileUi((s) => s.detail !== undefined);
  const { t } = useTranslation();
  if (detail) return null;
  const label = section === "temporal" ? t("temporal.footer.new") : section === "calendar" ? t("calendar.footer.new") : t("footer.newQuest");
  return (
    <button
      className="mfab"
      aria-label={label}
      title={label}
      onClick={() => {
        sfx.move();
        if (section === "temporal") useTemporalUi.getState().setForm({ mode: "create" });
        else if (section === "calendar") addBlock(useCalendarUi.getState().day);
        // En el tablón, la línea rápida (features/quickadd); desde ella, «Más detalles» abre el formulario.
        else useQuickUi.getState().setSheet(true);
      }}
    >
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
        <path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  );
}

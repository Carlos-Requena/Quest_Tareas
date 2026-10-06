import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useGame } from "../../../store/game";
import { sfx } from "../../../lib/sfx";
import i18n from "../../../i18n";
import { disableNotifications, enableNotifications, notifyEnabled, onNotifyChange } from "../service";

function useNotify() {
  const [on, setOn] = useState(notifyEnabled);
  useEffect(() => onNotifyChange(setOn), []);
  const toggle = async () => {
    sfx.move();
    const say = useGame.getState().say;
    if (on) {
      await disableNotifications();
      say(() => i18n.t("notifications.toast.off"));
    } else if (await enableNotifications()) say(() => i18n.t("notifications.toast.on"));
    else say(() => i18n.t("notifications.toast.denied"));
  };
  return { on, toggle };
}

/** Campana de la cabecera: activar o quitar los avisos del sistema en este equipo. */
export function NotifyButton() {
  const { t } = useTranslation();
  const { on, toggle } = useNotify();
  return (
    <button className={`mute nf-btn ${on ? "on" : ""}`} title={on ? t("notifications.off") : t("notifications.on")} aria-pressed={on} onClick={toggle}>
      <BellIcon off={!on} />
    </button>
  );
}

/** Interruptor del menú «Más» del teléfono. */
export function NotifyMenuToggle() {
  const { t } = useTranslation();
  const { on, toggle } = useNotify();
  return (
    <button className={`mmenu-toggle ${on ? "on" : ""}`} aria-pressed={on} onClick={toggle}>
      {on ? t("notifications.menuOn") : t("notifications.menuOff")}
    </button>
  );
}

export function BellIcon({ off }: { off?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
      <path d="M8 2.2a4 4 0 0 0-4 4v2.6L2.8 11h10.4L12 8.8V6.2a4 4 0 0 0-4-4z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M6.6 12.8a1.5 1.5 0 0 0 2.8 0" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      {off && <path d="M2.5 2.5l11 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />}
    </svg>
  );
}

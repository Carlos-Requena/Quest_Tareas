import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { sfx } from "../../../lib/sfx";
import { useNow } from "../../../lib/time";
import { useGame } from "../../../store/game";
import { initSync, signIn, signOut, syncNow } from "../actions";
import { useSyncUi } from "../ui";
import "../sync.css";

/**
 * Nube de la cabecera: su color dice si está sincronizado. Al pasar el ratón (o con el
 * foco) se despliega el panel, en una capa flotante para no mover la cabecera.
 */
export function SyncControl() {
  const { t, i18n } = useTranslation();
  const { phase, account, last, error } = useSyncUi();
  const now = useNow();

  const when = last && relative(last.at, now, i18n.language);
  const busy = phase === "syncing" || phase === "signingIn";

  return (
    <div className={`sync is-${phase}`}>
      <button
        className="sync-btn"
        title={t(`sync.button.${phase}`)}
        aria-label={t(`sync.button.${phase}`)}
        onClick={() => {
          if (phase === "signedOut") {
            sfx.move();
            void signIn();
          } else if (phase === "idle" || phase === "error") {
            sfx.move();
            void syncNow({ manual: true });
          }
        }}
      >
        <CloudIcon />
      </button>
      <div className="sync-pop" role="group" aria-label={t("sync.title")}>
        <span className="sync-pop-title">{t("sync.title")}</span>
        {phase === "unavailable" && <p className="sync-pop-text">{t("sync.unavailable")}</p>}
        {phase === "unconfigured" && <p className="sync-pop-text">{t("sync.unconfigured")}</p>}
        {phase === "signedOut" && <p className="sync-pop-text">{t("sync.intro")}</p>}
        {phase === "signingIn" && <p className="sync-pop-text">{t("sync.waiting")}</p>}
        {account && phase !== "signedOut" && <p className="sync-pop-text">{t("sync.account", { email: account.email })}</p>}
        {(phase === "idle" || phase === "syncing" || phase === "error") && (
          <p className="sync-pop-meta">
            {when ? t("sync.last", { when }) : t("sync.never")}
            {last && (last.pulled > 0 || last.pushed > 0) && <> · {t("sync.report", { pulled: last.pulled, pushed: last.pushed })}</>}
          </p>
        )}
        {error && phase === "error" && <p className="sync-pop-err">{t(`sync.error.${errorKey(error)}`)}</p>}
        <div className="sync-pop-actions">
          {(phase === "signedOut" || phase === "signingIn") && (
            <button className="sync-act is-main" disabled={phase === "signingIn"} onClick={() => void signIn()}>
              {t("sync.connect")}
            </button>
          )}
          {(phase === "idle" || phase === "syncing" || phase === "error") && (
            <>
              <button className="sync-act" disabled={busy} onClick={() => void syncNow({ manual: true })}>
                {phase === "syncing" ? t("sync.button.syncing") : t("sync.syncNow")}
              </button>
              <button className="sync-act" disabled={busy} onClick={() => void signOut()}>
                {t("sync.disconnect")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Arranca la sincronización cuando el juego ya está cargado (va montado en App). */
export function SyncWatcher() {
  const ready = useGameReady();
  useEffect(() => {
    if (ready) void initSync();
  }, [ready]);
  return null;
}

const useGameReady = () => useGame((s) => s.ready && !!s.store);

type ErrorKey = "network" | "drive" | "keyring" | "auth" | "other";
const errorKey = (code: string): ErrorKey => (["network", "drive", "keyring", "auth"].includes(code) ? (code as ErrorKey) : "other");

/** «hace 3 minutos» en el idioma activo. */
function relative(at: number, now: number, lang: string): string {
  const s = Math.round((at - now) / 1000);
  const fmt = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  if (Math.abs(s) < 60) return fmt.format(Math.min(0, s), "second");
  if (Math.abs(s) < 3600) return fmt.format(Math.round(s / 60), "minute");
  if (Math.abs(s) < 86_400) return fmt.format(Math.round(s / 3600), "hour");
  return fmt.format(Math.round(s / 86_400), "day");
}

/** Nube con una flecha circular (gira mientras sincroniza). */
function CloudIcon() {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" aria-hidden className="sync-icon">
      <path
        d="M4.2 11.5H3.6A2.6 2.6 0 0 1 3.4 6.3 3.6 3.6 0 0 1 10.3 5a2.9 2.9 0 0 1 2.3 6.5h-.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      <g className="sync-arrows">
        <path d="M6.2 10.4a1.9 1.9 0 0 1 3.4-.9" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        <path d="M9.8 11.4a1.9 1.9 0 0 1-3.4.9" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      </g>
      <circle className="sync-dot" cx="13.6" cy="2.4" r="1.8" />
    </svg>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { failureReport, type Failure } from "../model";
import "../recovery.css";

/**
 * Pantalla de un fallo de la interfaz. No usa el store ni nada del juego: puede que el
 * fallo venga de ahí. Solo textos (i18next), estilos y los dos botones.
 */
export function RecoveryScreen({ failure, onRetry }: { failure: Failure; onRetry: () => void }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const text = failureReport(failure, { version: __APP_VERSION__, userAgent: navigator.userAgent, at: Date.now() });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Sin permiso para el portapapeles: los detalles siguen a la vista para copiarlos a mano.
    }
  };

  return (
    <main className="rc" role="alert">
      <div className="rc-card">
        <p className="rc-tag">CONTINUE?</p>
        <h1 className="rc-title">{t("recovery.title")}</h1>
        <p className="rc-body">{t("recovery.body")}</p>
        <div className="rc-actions">
          <button className="rc-btn rc-primary" onClick={onRetry} autoFocus>
            {t("recovery.retry")}
          </button>
          <button className="rc-btn" onClick={() => location.reload()}>
            {t("recovery.reload")}
          </button>
        </div>
        <details className="rc-details">
          <summary>{t("recovery.details")}</summary>
          <pre className="rc-pre">
            {failure.message}
            {failure.stack && `\n\n${failure.stack}`}
          </pre>
          <button className="rc-btn rc-small" onClick={copy}>
            {copied ? t("recovery.copied") : t("recovery.copy")}
          </button>
        </details>
      </div>
    </main>
  );
}

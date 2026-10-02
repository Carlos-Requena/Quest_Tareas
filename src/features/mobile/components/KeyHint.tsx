import { Trans, useTranslation } from "react-i18next";
import { useIsPhone } from "../phone";

export type TouchHint = "continue" | "skip";
/** Textos con <kbd> de las animaciones a pantalla completa. */
export type KeyHintKey = "clear.hint" | "temporal.clear.hint" | "temporal.posted.hint";

/**
 * Pista de las animaciones a pantalla completa: «Pulsa Enter para continuar» en el escritorio
 * y «Toca para continuar» en el teléfono, donde no hay teclado.
 */
export function KeyHint({ i18nKey, touch }: { i18nKey: KeyHintKey; touch: TouchHint }) {
  const phone = useIsPhone();
  const { t } = useTranslation();
  if (phone) return <>{t(`mobile.touch.${touch}`)}</>;
  return <Trans i18nKey={i18nKey} components={{ kbd: <kbd /> }} />;
}

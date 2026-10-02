import "i18next";
import type { Translation } from "./locales/es";

// Claves tipadas: t("clave.inexistente") falla al compilar.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: Translation };
  }
}

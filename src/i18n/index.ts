import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { es } from "./locales/es";
import { ja } from "./locales/ja";

export const LANGS = {
  es: { label: "ES", locale: "es-ES" },
  ja: { label: "日本語", locale: "ja-JP" },
} as const;

export type Lang = keyof typeof LANGS;

export const locales: Record<Lang, typeof es> = { es, ja };

const STORAGE_KEY = "quests.lang";

/** Preferencia guardada en este equipo; si no hay, el idioma del sistema. */
function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "es" || saved === "ja") return saved;
  } catch {
    // localStorage no disponible: seguimos con el idioma del sistema
  }
  return navigator.language.toLowerCase().startsWith("ja") ? "ja" : "es";
}

i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, ja: { translation: ja } },
  lng: initialLang(),
  fallbackLng: "es",
  interpolation: { escapeValue: false }, // React ya escapa el texto
  initAsync: false, // los recursos van incluidos: inicialización síncrona
});

const applyLang = (lng: string) => {
  document.documentElement.lang = lng;
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {
    // sin persistencia: el idioma se mantiene solo en esta sesión
  }
};
applyLang(i18n.language);
i18n.on("languageChanged", applyLang);

export const currentLang = (): Lang => (i18n.language === "ja" ? "ja" : "es");

export function setLang(lang: Lang) {
  void i18n.changeLanguage(lang);
}

export function toggleLang() {
  setLang(currentLang() === "es" ? "ja" : "es");
}

/** Número con los separadores del idioma activo (1.150 / 1,150). */
export const num = (n: number) => n.toLocaleString(LANGS[currentLang()].locale);

export default i18n;

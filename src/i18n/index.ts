import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./locales/en";
import { ar } from "./locales/ar";

export const SUPPORTED_LANGUAGES = ["en", "ar"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = "shippingapp.lang";
const RTL_LANGUAGES: SupportedLanguage[] = ["ar"];

export function dirForLanguage(lang: string): "rtl" | "ltr" {
  return RTL_LANGUAGES.includes(lang as SupportedLanguage) ? "rtl" : "ltr";
}

function getStoredLanguage(): SupportedLanguage {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored)) {
    return stored as SupportedLanguage;
  }
  return "en";
}

function applyDocumentDirection(lang: string) {
  document.documentElement.lang = lang;
  document.documentElement.dir = dirForLanguage(lang);
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: getStoredLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

applyDocumentDirection(i18n.language);

i18n.on("languageChanged", (lang) => {
  localStorage.setItem(STORAGE_KEY, lang);
  applyDocumentDirection(lang);
});

export default i18n;

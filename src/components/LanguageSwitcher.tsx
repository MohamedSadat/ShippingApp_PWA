import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "../i18n";

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: "EN",
  ar: "AR",
};

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="lang-switcher">
      {SUPPORTED_LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          className={`lang-switcher__btn${i18n.language === lang ? " lang-switcher__btn--active" : ""}`}
          onClick={() => i18n.changeLanguage(lang)}
        >
          {LANGUAGE_LABELS[lang]}
        </button>
      ))}
    </div>
  );
}

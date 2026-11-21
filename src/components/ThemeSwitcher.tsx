import { useTranslation } from "react-i18next";
import { setThemeChoice, THEME_CHOICES, useThemeChoice, type ThemeChoice } from "../lib/theme";
import { Icon, type IconName } from "./Icon";

const ICONS: Record<ThemeChoice, IconName> = { system: "monitor", light: "sun", dark: "moon" };

/** System / Light / Dark. Icons only in the top bar; with labels on Settings. */
export function ThemeSwitcher({ labels = false }: { labels?: boolean }) {
  const { t } = useTranslation();
  const current = useThemeChoice();

  return (
    <div className="theme-switcher" role="radiogroup" aria-label={t("theme.title")}>
      {THEME_CHOICES.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={current === option}
          aria-label={labels ? undefined : t(`theme.${option}`)}
          title={t(`theme.${option}`)}
          className={`lang-switcher__btn theme-switcher__btn${current === option ? " lang-switcher__btn--active" : ""}`}
          onClick={() => setThemeChoice(option)}
        >
          <Icon name={ICONS[option]} size={16} />
          {labels && <span>{t(`theme.${option}`)}</span>}
        </button>
      ))}
    </div>
  );
}

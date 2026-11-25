import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { LanguageSwitcher } from "../../../components/LanguageSwitcher";
import { ThemeSwitcher } from "../../../components/ThemeSwitcher";
import { PLAY_STORE_URL, PORTAL_URL } from "../../../lib/appLinks";

export function Settings() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const settingsPath = `/${user?.role ?? "customer"}/settings`;

  return (
    <section className="page">
      <h1>{t("settings.title")}</h1>
      <div className="card">
        <p className="card__placeholder">{t("settings.language")}</p>
        <LanguageSwitcher />
      </div>
      <div className="card">
        <p className="card__placeholder">{t("theme.title")}</p>
        <ThemeSwitcher labels />
      </div>
      <div className="card settings-links">
        <Link to={`${settingsPath}/notifications`}>{t("settings.notifications")}</Link>
        <Link to={`${settingsPath}/password`}>{t("settings.changePassword")}</Link>
      </div>
      <div className="card settings-links">
        <a href={PORTAL_URL} target="_blank" rel="noopener noreferrer">
          {t("settings.portal")}
        </a>
        <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
          {t("settings.androidApp")}
        </a>
      </div>
      <div className="card">
        <button type="button" className="settings-signout" onClick={signOut}>
          {t("settings.signOut")}
        </button>
      </div>
      <p className="settings-version">
        {t("settings.version", { version: __APP_VERSION__, build: __APP_BUILD__ })}
      </p>
    </section>
  );
}

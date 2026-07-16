import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { LanguageSwitcher } from "../../../components/LanguageSwitcher";

export function Settings() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <section className="page">
      <h1>{t("settings.title")}</h1>
      <div className="card">
        <p className="card__placeholder">{t("settings.language")}</p>
        <LanguageSwitcher />
      </div>
      <div className="card">
        <p className="card__placeholder">{t("settings.noSettings")}</p>
      </div>
      {user?.role === "customer" && (
        <div className="card">
          <Link to="/customer/settings/notifications">{t("settings.notifications")}</Link>
        </div>
      )}
    </section>
  );
}

import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";

export function Manifest() {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <section className="page">
      <h1>{t("manifest.title")}</h1>
      <p>{t("manifest.agent", { name: user?.name })}</p>
      {/* TODO: assigned pickups/deliveries list, backed by UnifiedAPI */}
      <div className="card">
        <p className="card__placeholder">{t("manifest.noStops")}</p>
      </div>
    </section>
  );
}

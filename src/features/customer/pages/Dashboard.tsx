import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";

export function Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <section className="page">
      <h1>{t("dashboard.title")}</h1>
      <p>{t("dashboard.welcome", { name: user?.name })}</p>
      {/* TODO: shipment summary/status widgets, backed by UnifiedAPI */}
      <div className="card">
        <p className="card__placeholder">{t("dashboard.noShipments")}</p>
      </div>
    </section>
  );
}

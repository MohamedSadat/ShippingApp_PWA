import { useTranslation } from "react-i18next";

export function AddShipment() {
  const { t } = useTranslation();

  return (
    <section className="page">
      <h1>{t("addShipment.title")}</h1>
      {/* TODO: new shipment request form, backed by UnifiedAPI */}
      <div className="card">
        <p className="card__placeholder">{t("addShipment.comingSoon")}</p>
      </div>
    </section>
  );
}

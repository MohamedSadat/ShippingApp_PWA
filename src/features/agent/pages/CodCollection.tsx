import { useTranslation } from "react-i18next";

export function CodCollection() {
  const { t } = useTranslation();

  return (
    <section className="page">
      <h1>{t("cod.title")}</h1>
      {/* TODO: list of COD-due waybills for this agent, mark collected, backed by UnifiedAPI */}
      <div className="card">
        <p className="card__placeholder">{t("cod.none")}</p>
      </div>
    </section>
  );
}

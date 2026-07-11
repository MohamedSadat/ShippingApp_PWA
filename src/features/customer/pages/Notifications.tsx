import { useTranslation } from "react-i18next";

export function Notifications() {
  const { t } = useTranslation();

  return (
    <section className="page">
      <h1>{t("notifications.title")}</h1>
      {/* TODO: push notification opt-in + history; iOS requires home-screen install first (16.4+) */}
      <div className="card">
        <p className="card__placeholder">{t("notifications.none")}</p>
      </div>
    </section>
  );
}

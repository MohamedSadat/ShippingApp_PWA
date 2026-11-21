import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { Icon, type IconName } from "../../../components/Icon";
import { getPartnerDashboard, type PartnerDashboard, type PartnerDashboardCounts } from "../../../lib/unifiedApi";

const PERIODS = [7, 30, 90] as const;
type Period = (typeof PERIODS)[number];

// Two rows of three, in the reading order of the reference dashboard.
const CARDS: { key: keyof PartnerDashboardCounts; icon: IconName }[] = [
  { key: "awaiting", icon: "awaiting" },
  { key: "inWarehouse", icon: "warehouse" },
  { key: "delivered", icon: "delivered" },
  { key: "outForDelivery", icon: "truck" },
  { key: "redelivery", icon: "redelivery" },
  { key: "failed", icon: "failed" },
];

/**
 * The customer's shipments by status over 7, 30 or 90 days. Counts come only from the
 * server (GetPartnerDashboard); while it has no such endpoint every card shows a dash.
 */
export function DashboardStats() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>(30);
  // The period the result is for: a new period shows "…" until its own numbers arrive.
  const [result, setResult] = useState<{ period: Period; data: PartnerDashboard | null }>();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getPartnerDashboard(user.apiKey, period)
      .then((data) => {
        if (cancelled) return;
        setError(false);
        setResult({ period, data });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user, period]);

  const current = result?.period === period ? result : undefined;
  const valueOf = (key: keyof PartnerDashboardCounts) =>
    current?.data ? String(current.data.counts[key]) : current || error ? "—" : "…";

  return (
    <section className="dash-section" aria-labelledby="dash-stats-title">
      <div className="dash-section__head">
        <h2 id="dash-stats-title" className="dash-section__title">
          {t("dashboard.stats")}
        </h2>
        <div className="dash-period" role="tablist" aria-label={t("dashboard.period")}>
          {PERIODS.map((days) => (
            <button
              key={days}
              type="button"
              role="tab"
              aria-selected={days === period}
              className={`dash-period__option${days === period ? " dash-period__option--active" : ""}`}
              onClick={() => setPeriod(days)}
            >
              {t(`dashboard.period${days}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="dash-grid">
        {CARDS.map(({ key, icon }) => {
          const label = t(`dashboard.status.${key}`);
          const value = valueOf(key);
          return (
            <div key={key} className="dash-card" role="group" aria-label={`${label}: ${value}`}>
              <span className="dash-card__badge">
                <Icon name={icon} size={26} />
              </span>
              <span className="dash-card__label">{label}</span>
              <span className="dash-card__value">{value}</span>
            </div>
          );
        })}
      </div>
      {error && <p className="dash-error">{t("common.networkError")}</p>}
      {current?.data === null && !error && <p className="card__placeholder">{t("dashboard.statsUnavailable")}</p>}
    </section>
  );
}

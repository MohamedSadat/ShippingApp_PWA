import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { Icon, type IconName } from "../../../components/Icon";
import { TONE_COLOR, type StatusTone } from "../../../lib/statusTone";
import { getPartnerDashboard, type PartnerDashboard, type PartnerDashboardCounts } from "../../../lib/unifiedApi";

const PERIODS = [7, 30, 90] as const;
type Period = (typeof PERIODS)[number];

type Bucket = keyof PartnerDashboardCounts;

/**
 * Each tile opens My shipments filtered to it. Buckets that need the merchant come first.
 * `segment`: failed and delivered shipments are finished (Completed list); the rest are
 * still in progress.
 */
const CARDS: { key: Bucket; icon: IconName; tone: StatusTone; segment: "active" | "completed" }[] = [
  { key: "failed", icon: "failed", tone: "failed", segment: "completed" },
  { key: "redelivery", icon: "redelivery", tone: "redelivery", segment: "active" },
  { key: "awaiting", icon: "awaiting", tone: "created", segment: "active" },
  { key: "inWarehouse", icon: "warehouse", tone: "warehouse", segment: "active" },
  { key: "outForDelivery", icon: "truck", tone: "outForDelivery", segment: "active" },
  { key: "delivered", icon: "delivered", tone: "delivered", segment: "completed" },
];

const ATTENTION: Bucket[] = ["failed", "redelivery"];

function listLink(card: (typeof CARDS)[number], period: Period) {
  return `/customer/shipments?segment=${card.segment}&status=${card.tone}&days=${period}`;
}

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
  const counts = current?.data?.counts;
  const valueOf = (key: Bucket) => (counts ? String(counts[key]) : current || error ? "—" : "…");
  const attention = counts ? CARDS.filter((c) => ATTENTION.includes(c.key) && counts[c.key] > 0) : [];

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
      <p className="dash-basis">{t("dashboard.byOrderDate")}</p>

      {attention.length > 0 && (
        <div className="attention-card" role="region" aria-label={t("dashboard.needsAttention")}>
          <h3 className="attention-card__title">
            <Icon name="failed" size={20} />
            {t("dashboard.needsAttention")}
          </h3>
          {attention.map((card) => (
            <Link key={card.key} to={listLink(card, period)} className="attention-card__row">
              <span>{t(`dashboard.status.${card.key}`)}</span>
              <span className="attention-card__count">{counts?.[card.key]}</span>
              <Icon name="chevron" size={18} className="dash-row__chevron" />
            </Link>
          ))}
        </div>
      )}

      <div className="dash-grid">
        {CARDS.map((card) => {
          const label = t(`dashboard.status.${card.key}`);
          const value = valueOf(card.key);
          const zero = counts?.[card.key] === 0;
          const style = { "--tone": TONE_COLOR[card.tone] } as CSSProperties;
          const body = (
            <>
              <span className="dash-card__badge">
                <Icon name={card.icon} size={24} />
              </span>
              <span className="dash-card__label">{label}</span>
              <span className="dash-card__value">{value}</span>
            </>
          );
          return counts ? (
            <Link
              key={card.key}
              to={listLink(card, period)}
              className={`dash-card${zero ? " dash-card--zero" : ""}`}
              style={style}
              aria-label={`${label}: ${value}`}
            >
              {body}
            </Link>
          ) : (
            <div key={card.key} className="dash-card" style={style} role="group" aria-label={`${label}: ${value}`}>
              {body}
            </div>
          );
        })}
      </div>
      {error && <p className="dash-error">{t("common.networkError")}</p>}
      {current?.data === null && !error && <p className="card__placeholder">{t("dashboard.statsUnavailable")}</p>}
    </section>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { CompanyLogo } from "../../../components/CompanyLogo";
import { Icon, type IconName } from "../../../components/Icon";
import { getPartnerPendingOrders, type ShipOrderDto } from "../../../lib/unifiedApi";
import { BalanceStrip } from "../components/BalanceStrip";
import { DashboardStats } from "../components/DashboardStats";
import { PrintableShipmentGrid } from "../components/PrintableShipmentGrid";

const PAGE_SIZE = 30;

const ROWS: { to: string; icon: IconName; labelKey: string }[] = [
  { to: "/customer/shipments/new", icon: "plus", labelKey: "dashboard.newShipment" },
  { to: "/customer/track", icon: "qr", labelKey: "dashboard.track" },
  { to: "/customer/shipments", icon: "box", labelKey: "dashboard.myShipments" },
  { to: "/customer/account", icon: "wallet", labelKey: "dashboard.account" },
];

export function Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [orders, setOrders] = useState<ShipOrderDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPartnerPendingOrders(user.apiKey, pageNumber, PAGE_SIZE)
      .then((result) => {
        if (cancelled) return;
        setOrders(result.data);
        setTotalCount(result.totalCount);
      })
      .catch(() => {
        if (!cancelled) setError(t("common.networkError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, pageNumber, t]);

  return (
    <section className="page">
      <div className="dash-header">
        <CompanyLogo url={user?.companyLogoUrl} alt={user?.company} className="company-logo" />
        <Link to="/customer/settings" className="dash-header__settings" aria-label={t("nav.settings")}>
          <Icon name="settings" size={26} />
        </Link>
      </div>
      <h1>{t("dashboard.title")}</h1>
      <p>{t("dashboard.welcome", { name: user?.userName })}</p>

      <DashboardStats />
      <BalanceStrip />

      <section className="dash-section" aria-labelledby="dash-shipments-title">
        <h2 id="dash-shipments-title" className="dash-section__title">
          {t("dashboard.shipments")}
        </h2>
        <nav className="dash-rows">
          {ROWS.map((row) => (
            <Link key={row.to} to={row.to} className="dash-row">
              <Icon name={row.icon} className="dash-row__icon" />
              <span className="dash-row__label">{t(row.labelKey)}</span>
              <Icon name="chevron" size={20} className="dash-row__chevron" />
            </Link>
          ))}
        </nav>
      </section>

      <h2 className="dashboard-stats__section-title">
        {!loading && !error ? t("dashboard.pendingWithCount", { total: totalCount }) : t("dashboard.pending")}
      </h2>

      {loading && <p className="card__placeholder">{t("dashboard.loading")}</p>}
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      {!loading && !error && orders.length === 0 && (
        <div className="card">
          <p className="card__placeholder">{t("dashboard.noShipments")}</p>
        </div>
      )}

      {!loading && !error && (
        <PrintableShipmentGrid
          orders={orders}
          totalCount={totalCount}
          pageNumber={pageNumber}
          pageSize={PAGE_SIZE}
          onPageChange={setPageNumber}
          ariaLabel={t("dashboard.pending")}
        />
      )}
    </section>
  );
}

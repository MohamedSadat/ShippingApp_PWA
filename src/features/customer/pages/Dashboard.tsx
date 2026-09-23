import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { CompanyLogo } from "../../../components/CompanyLogo";
import { getPartnerPendingOrders, type ShipOrderDto } from "../../../lib/unifiedApi";
import { PrintableShipmentGrid } from "../components/PrintableShipmentGrid";

const PAGE_SIZE = 30;

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

  const totalCod = orders.reduce((sum, order) => sum + order.codAmount, 0);

  return (
    <section className="page">
      <CompanyLogo url={user?.companyLogoUrl} alt={user?.company} className="company-logo" />
      <h1>{t("dashboard.title")}</h1>
      <p>{t("dashboard.welcome", { name: user?.userName })}</p>

      {loading && <p className="card__placeholder">{t("dashboard.loading")}</p>}
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      {!loading && !error && (
        <div className="dashboard-stats">
          <div className="dashboard-stats__tile">
            <span className="dashboard-stats__value">{totalCount}</span>
            <span className="dashboard-stats__label">{t("dashboard.pendingCount")}</span>
          </div>
          <div className="dashboard-stats__tile">
            <span className="dashboard-stats__value">{totalCod.toFixed(2)}</span>
            <span className="dashboard-stats__label">{t("dashboard.totalCod")}</span>
          </div>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="card">
          <p className="card__placeholder">{t("dashboard.noShipments")}</p>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <h2 className="dashboard-stats__section-title">{t("dashboard.pending")}</h2>
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

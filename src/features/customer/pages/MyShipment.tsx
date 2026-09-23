import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { getPartnerCompletedOrders, type ShipOrderDto } from "../../../lib/unifiedApi";
import { PrintableShipmentGrid } from "../components/PrintableShipmentGrid";

const PAGE_SIZE = 30;

export function MyShipment() {
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
    getPartnerCompletedOrders(user.apiKey, pageNumber, PAGE_SIZE)
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
      <h1>{t("myShipment.title")}</h1>

      {loading && <p className="card__placeholder">{t("myShipment.loading")}</p>}
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      {!loading && !error && orders.length === 0 && (
        <div className="card">
          <p className="card__placeholder">{t("myShipment.noShipments")}</p>
        </div>
      )}

      {!loading && !error && (
        <PrintableShipmentGrid
          orders={orders}
          totalCount={totalCount}
          pageNumber={pageNumber}
          pageSize={PAGE_SIZE}
          onPageChange={setPageNumber}
          ariaLabel={t("myShipment.title")}
        />
      )}
    </section>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { getMyOrders, type ShipOrderDto } from "../../../lib/unifiedApi";
import { formatDate } from "../../../lib/formatDate";

const PAGE_SIZE = 30;

export function MyShipment() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
    getMyOrders(user.apiKey, pageNumber, PAGE_SIZE)
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

  const hasNextPage = pageNumber * PAGE_SIZE < totalCount;

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

      {!loading && !error && orders.length > 0 && (
        <ul className="order-list">
          {orders.map((order) => (
            <li
              key={order.orderId}
              className="order-list__item order-list__item--clickable"
              onClick={() => navigate(`/customer/shipments/${order.orderId}`)}
            >
              <div className="order-list__row">
                <span className="order-list__id">{order.orderId}</span>
                <span className="order-list__status">{order.orderStatus}</span>
              </div>
              <div className="order-list__row">
                <span className="order-list__date">{formatDate(order.orderDate)}</span>
                <span className="order-list__cod">{t("myShipment.cod", { amount: order.codAmount.toFixed(2) })}</span>
              </div>
              <div className="order-list__row">
                <span className="order-list__contact">{order.contactName}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && totalCount > 0 && (
        <div className="order-list__pagination">
          <button type="button" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => p - 1)}>
            {t("myShipment.previous")}
          </button>
          <span>{t("myShipment.page", { page: pageNumber })}</span>
          <button type="button" disabled={!hasNextPage} onClick={() => setPageNumber((p) => p + 1)}>
            {t("myShipment.next")}
          </button>
        </div>
      )}
    </section>
  );
}

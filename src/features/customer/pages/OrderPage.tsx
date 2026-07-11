import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { getOrder, type ShipOrderDto } from "../../../lib/unifiedApi";
import { formatDate } from "../../../lib/formatDate";

export function OrderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<ShipOrderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !orderId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getOrder(user.apiKey, orderId)
      .then((result) => {
        if (!cancelled) setOrder(result);
      })
      .catch(() => {
        if (!cancelled) setError(t("orderPage.error"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, orderId, t]);

  const address = order?.toAddressModel;
  const addressLines = address
    ? [address.address1, address.address2, [address.city, address.state, address.zipCode].filter(Boolean).join(", "), address.country].filter(
        (line): line is string => !!line,
      )
    : [];

  return (
    <section className="page">
      <button type="button" className="order-detail__back" onClick={() => navigate(-1)}>
        {t("common.back")}
      </button>
      <h1>{t("orderPage.title", { orderId })}</h1>

      {loading && <p className="card__placeholder">{t("orderPage.loading")}</p>}
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      {!loading && !error && !order && (
        <div className="card">
          <p className="card__placeholder">{t("orderPage.notFound")}</p>
        </div>
      )}

      {!loading && !error && order && (
        <>
          <div className="card">
            <div className="order-list__row">
              <span className="order-list__id">{order.orderId}</span>
              <span className="order-list__status">{order.orderStatus}</span>
            </div>
            <div className="order-list__row">
              <span className="order-list__date">{formatDate(order.orderDate)}</span>
            </div>
            {order.description && <p className="order-detail__description">{order.description}</p>}
          </div>

          <div className="card">
            <h2 className="order-detail__section-title">{t("orderPage.recipient")}</h2>
            <p>{order.contactName}</p>
            {order.custAccountModel?.name && <p className="card__placeholder">{order.custAccountModel.name}</p>}
            {addressLines.map((line, i) => (
              <p key={i} className="card__placeholder">
                {line}
              </p>
            ))}
          </div>

          <div className="card">
            <h2 className="order-detail__section-title">{t("orderPage.carrier")}</h2>
            <p>{order.carrierName ?? t("common.notAssigned")}</p>
          </div>

          <div className="card">
            <h2 className="order-detail__section-title">{t("orderPage.charges")}</h2>
            <div className="order-list__row">
              <span>{t("orderPage.codAmount")}</span>
              <span>{order.codAmount.toFixed(2)}</span>
            </div>
            <div className="order-list__row">
              <span>{t("orderPage.freightAmount")}</span>
              <span>{order.freightAmount.toFixed(2)}</span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

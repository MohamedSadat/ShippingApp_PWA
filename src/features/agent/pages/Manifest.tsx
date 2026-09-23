import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { CompanyLogo } from "../../../components/CompanyLogo";
import { getPartnerPendingOrders, type ShipOrderDto } from "../../../lib/unifiedApi";

export function Manifest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [orders, setOrders] = useState<ShipOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPartnerPendingOrders(user.apiKey)
      .then((result) => {
        if (!cancelled) setOrders(result.data);
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
  }, [user, t]);

  return (
    <section className="page">
      <CompanyLogo url={user?.companyLogoUrl} alt={user?.company} className="company-logo" />
      <h1>{t("manifest.title")}</h1>
      <p>{t("manifest.agent", { name: user?.userName })}</p>

      {loading && <p className="card__placeholder">{t("manifest.loading")}</p>}
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      {!loading && !error && orders.length === 0 && (
        <div className="card">
          <p className="card__placeholder">{t("manifest.noStops")}</p>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <ul className="order-list">
          {orders.map((order) => {
            const contact = order.contactName || order.toAddressModel?.contactName;
            const phone = order.contactPhone || order.toAddressModel?.phone;
            const street = order.toAddressModel?.street;

            return (
              <li
                key={order.orderId}
                className="order-list__item order-list__item--clickable"
                onClick={() => navigate(`/agent/scan/delivery?waybill=${encodeURIComponent(order.orderId)}`)}
              >
                <div className="order-list__row">
                  <span className="order-list__id">{order.orderId}</span>
                  <span className="order-list__status">{order.orderStatus}</span>
                </div>
                <div className="order-list__row">
                  <span className="order-list__contact">{contact}</span>
                  <span className="order-list__cod">
                    {t("manifest.cod")}: {order.codAmount.toFixed(2)}
                  </span>
                </div>
                {phone && (
                  <div className="order-list__row">
                    {/* Stop propagation so tapping the number dials instead of opening the scan page. */}
                    <a className="manifest-item__phone" href={`tel:${phone}`} onClick={(e) => e.stopPropagation()}>
                      {phone}
                    </a>
                  </div>
                )}
                {street && (
                  <div className="order-list__row">
                    <span className="manifest-item__street">{street}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

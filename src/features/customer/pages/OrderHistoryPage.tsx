import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { ApiStatusError, getOrderHistory, type ShipHistoryRow } from "../../../lib/unifiedApi";
import { formatDateTime } from "../../../lib/formatDate";

/**
 * A shipment's status history, oldest first: the web app's ShipOrderHistoryPage for a customer.
 * Cards rather than its grid, to fit a phone, and only what the API gives a partner key.
 */
export function OrderHistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { orderId } = useParams<{ orderId: string }>();
  const [rows, setRows] = useState<ShipHistoryRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !orderId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getOrderHistory(user.apiKey, orderId)
      .then((result) => {
        if (!cancelled) setRows(result);
      })
      .catch((err) => {
        if (cancelled) return;
        // As on the shipment page: someone else's order reads as not found.
        if (err instanceof ApiStatusError && (err.status === 404 || err.status === 403)) setRows(null);
        else setError(t("orderPage.error"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, orderId, t]);

  return (
    <section className="page">
      <button type="button" className="order-detail__back" onClick={() => navigate(-1)}>
        {t("common.back")}
      </button>
      <h1>
        {t("orderHistory.title")}{" "}
        {orderId && (
          <Link className="order-detail__status-link" dir="ltr" to={`/customer/shipments/${encodeURIComponent(orderId)}`}>
            {orderId}
          </Link>
        )}
      </h1>

      {loading && <p className="card__placeholder">{t("orderHistory.loading")}</p>}
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      {!loading && !error && !rows && (
        <div className="card">
          <p className="card__placeholder">{t("orderPage.notFound")}</p>
        </div>
      )}

      {!loading && !error && rows?.length === 0 && (
        <div className="card">
          <p className="card__placeholder">{t("orderHistory.empty")}</p>
        </div>
      )}

      {!loading &&
        !error &&
        rows?.map((row) => (
          <div key={row.recId} className="card">
            <div className="order-list__row">
              <span className="order-list__id">
                {row.statusTo}
                {row.isUndo && <span className="order-history__badge">{t("orderHistory.undo")}</span>}
                {!row.isUndo && row.isUndone && <span className="order-history__badge">{t("orderHistory.undone")}</span>}
              </span>
              <span className="order-list__date" dir="ltr">
                {formatDateTime(row.date)}
              </span>
            </div>
            {row.statusFrom && (
              <p className="order-detail__description">{t("orderHistory.from", { status: row.statusFrom })}</p>
            )}
            {row.notes && <p className="order-detail__description">{row.notes}</p>}
            {row.collected != null && (
              <div className="order-list__row order-history__amount">
                <span>{t("orderHistory.collected")}</span>
                <span dir="ltr">
                  {row.collected.toFixed(2)}
                  {row.codAmount != null && ` / ${row.codAmount.toFixed(2)}`}
                </span>
              </div>
            )}
            {row.freight != null && (
              <div className="order-list__row order-history__amount">
                <span>{t("orderPage.freightAmount")}</span>
                <span dir="ltr">{row.freight.toFixed(2)}</span>
              </div>
            )}
          </div>
        ))}
    </section>
  );
}

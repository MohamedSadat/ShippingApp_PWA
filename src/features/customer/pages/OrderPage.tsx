import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { useToast } from "../../../components/Toast";
import { ApiStatusError, getOrder, type ShipOrderDto } from "../../../lib/unifiedApi";
import { formatDate } from "../../../lib/formatDate";
import { EditShipmentForm } from "../components/EditShipmentForm";
import { governorateName } from "../shipmentFields";

export function OrderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t, i18n } = useTranslation();
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<ShipOrderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [conflict, setConflict] = useState(false);
  // Bumped to read the order again after an edit; the new version comes back with it.
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    if (!user || !orderId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getOrder(user.apiKey, orderId)
      .then((result) => {
        if (!cancelled) setOrder(result);
      })
      .catch((err) => {
        if (cancelled) return;
        // 404 is no such shipment, 403 one placed by another account: both read as
        // "not found" — the page shouldn't confirm someone else's order exists.
        if (err instanceof ApiStatusError && (err.status === 404 || err.status === 403)) setOrder(null);
        else setError(t("orderPage.error"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, orderId, t, reloadCount]);

  function handleEditSaved() {
    setEditing(false);
    setConflict(false);
    setReloadCount((count) => count + 1);
    // A label printed earlier still carries the old COD and address.
    showToast(t("orderPage.editSaved"));
  }

  // Close rather than retry with the new version, which would overwrite whatever
  // changed. The customer sees the shipment as it is now, and the button only if
  // it can still be edited.
  function handleEditConflict() {
    setEditing(false);
    setConflict(true);
    setReloadCount((count) => count + 1);
  }

  const address = order?.toAddressModel;
  const phones = order ? [order.contactPhone, order.contactPhone2].filter(Boolean).join(" / ") : "";
  const addressLines =
    order && address
      ? [
          address.street,
          [address.building, address.floor].filter(Boolean).join(", "),
          [address.zone?.name, address.city, governorateName(order, i18n.language)].filter(Boolean).join(", "),
          address.country,
        ].filter((line): line is string => !!line)
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

      {conflict && <p style={{ color: "var(--color-danger)" }}>{t("orderPage.editConflict")}</p>}

      {!loading && !error && order && editing && (
        <EditShipmentForm
          order={order}
          onSaved={handleEditSaved}
          onConflict={handleEditConflict}
          onCancel={() => setEditing(false)}
        />
      )}

      {!loading && !error && order && !editing && (
        <>
          {order.canEditDraft && (
            <button
              type="button"
              className="order-detail__edit"
              onClick={() => {
                setConflict(false);
                setEditing(true);
              }}
            >
              {t("orderPage.edit")}
            </button>
          )}

          <div className="card">
            <div className="order-list__row">
              <span className="order-list__id">{order.orderId}</span>
              {/* False, not just falsy: an API without the field can't tell a draft, or serve the history. */}
              {order.canEditDraft === false ? (
                <Link
                  className="order-list__status order-detail__status-link"
                  to={`/customer/shipments/${encodeURIComponent(order.orderId)}/history`}
                >
                  {order.orderStatus}
                </Link>
              ) : (
                <span className="order-list__status">{order.orderStatus}</span>
              )}
            </div>
            <div className="order-list__row">
              <span className="order-list__date">{formatDate(order.orderDate)}</span>
            </div>
            {order.description && <p className="order-detail__description">{order.description}</p>}
            <p className="order-detail__description">
              {t("addShipment.allowOpen")}: {order.allowOpen ? t("common.yes") : t("common.no")}
            </p>
          </div>

          <div className="card">
            <h2 className="order-detail__section-title">{t("orderPage.recipient")}</h2>
            <p>{order.contactName}</p>
            {phones && (
              <p className="card__placeholder" dir="ltr" style={{ textAlign: "start" }}>
                {phones}
              </p>
            )}
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

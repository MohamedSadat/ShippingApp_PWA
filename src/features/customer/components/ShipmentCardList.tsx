import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Amount } from "../../../components/Amount";
import { StatusChip } from "../../../components/StatusChip";
import { cleanName } from "../../../lib/contact";
import { formatDate } from "../../../lib/formatDate";
import { ltr } from "../../../lib/money";
import { needsAttention, statusTone } from "../../../lib/statusTone";
import type { ShipOrderDto } from "../../../lib/unifiedApi";
import { governorateName } from "../shipmentFields";

interface ShipmentCardListProps {
  orders: ShipOrderDto[];
  selected: ReadonlySet<string>;
  onToggle: (order: ShipOrderDto) => void;
}

/** My shipments on a phone: one tappable card per shipment, with a checkbox for label printing. */
export function ShipmentCardList({ orders, selected, onToggle }: ShipmentCardListProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  return (
    <ul className="order-list">
      {orders.map((order) => {
        const attention = needsAttention(statusTone(order.orderStatus));
        const place = [order.toAddressModel?.city, governorateName(order, i18n.language)]
          .map((p) => (p ?? "").trim())
          .filter((p, i, all) => p && all.indexOf(p) === i)
          .join(" · ");
        const isSelected = selected.has(order.orderId);
        return (
          <li
            key={order.orderId}
            className={`order-list__item order-list__item--clickable shipment-card${attention ? " shipment-card--attention" : ""}${isSelected ? " shipment-card--selected" : ""}`}
            onClick={() => navigate(`/customer/shipments/${encodeURIComponent(order.orderId)}`)}
          >
            <label className="shipment-card__check" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(order)}
                aria-label={t("shipmentGrid.selectOne", { id: ltr(order.orderId) })}
              />
            </label>
            <div className="shipment-card__body">
              <div className="shipment-card__row">
                <bdi dir="ltr" className="order-list__id">
                  {order.orderId}
                </bdi>
                <StatusChip status={order.orderStatus} />
              </div>
              <div className="shipment-card__row">
                <span className="shipment-card__name" dir="auto">
                  {cleanName(order.contactName) || "—"}
                </span>
                {place && <span className="shipment-card__muted">{place}</span>}
              </div>
              <div className="shipment-card__row">
                <span className="shipment-card__muted">{order.orderDate ? formatDate(order.orderDate) : ""}</span>
                {order.codAmount > 0 ? (
                  <Amount value={order.codAmount} className="shipment-card__cod" />
                ) : (
                  <span className="shipment-card__muted">{t("shipmentGrid.noCod")}</span>
                )}
              </div>
              {attention && (
                <Link
                  to={`/customer/shipments/${encodeURIComponent(order.orderId)}/history`}
                  className="shipment-card__action"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t("shipmentGrid.viewHistory")}
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

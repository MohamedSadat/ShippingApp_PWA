import { useEffect, useState } from "react";
import { useAuth } from "../../../auth/AuthContext";
import { getMyOrders, type ShipOrderDto } from "../../../lib/unifiedApi";

const PAGE_SIZE = 30;

export function MyShipment() {
  const { user } = useAuth();
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
        if (!cancelled) setError("Unable to load shipments. Check your connection and try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, pageNumber]);

  const hasNextPage = pageNumber * PAGE_SIZE < totalCount;

  return (
    <section className="page">
      <h1>My Shipment</h1>

      {loading && <p className="card__placeholder">Loading shipments...</p>}
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      {!loading && !error && orders.length === 0 && (
        <div className="card">
          <p className="card__placeholder">No shipments to show yet.</p>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <ul className="order-list">
          {orders.map((order) => (
            <li key={order.orderId} className="order-list__item">
              <div className="order-list__row">
                <span className="order-list__id">{order.orderId}</span>
                <span className="order-list__status">{order.orderStatus}</span>
              </div>
              <div className="order-list__row">
                <span className="order-list__date">{new Date(order.orderDate).toLocaleDateString()}</span>
                <span className="order-list__cod">COD {order.codAmount.toFixed(2)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && totalCount > 0 && (
        <div className="order-list__pagination">
          <button type="button" disabled={pageNumber <= 1} onClick={() => setPageNumber((p) => p - 1)}>
            Previous
          </button>
          <span>Page {pageNumber}</span>
          <button type="button" disabled={!hasNextPage} onClick={() => setPageNumber((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </section>
  );
}

import { useEffect, useState } from "react";
import { useAuth } from "../../../auth/AuthContext";
import { getMyOrders, type ShipOrder } from "../../../lib/api";

const PAGE_SIZE = 25;

export function MyOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ShipOrder[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
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
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load orders");
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
      <h1>My Orders</h1>

      {loading && <p className="card__placeholder">Loading orders...</p>}
      {error && <p className="login-error">{error}</p>}

      {!loading && !error && orders.length === 0 && (
        <div className="card">
          <p className="card__placeholder">No orders to show yet.</p>
        </div>
      )}

      {!loading &&
        !error &&
        orders.map((order) => (
          <div className="card" key={order.orderId}>
            <p>
              <strong>{order.orderId}</strong> &middot; {order.orderStatus}
            </p>
            <p className="card__placeholder">
              {new Date(order.orderDate).toLocaleDateString()}
              {order.carrierName ? ` · ${order.carrierName}` : ""}
            </p>
            <p>
              COD: {order.codAmount.toFixed(2)} &middot; Freight: {order.freightAmount.toFixed(2)}
            </p>
            {order.description && <p>{order.description}</p>}
          </div>
        ))}

      {!loading && !error && orders.length > 0 && (
        <div className="pagination">
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

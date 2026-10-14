import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { formatDate } from "../../../lib/formatDate";
import {
  getAccountBalance,
  getAgentCodOrders,
  ShipInvoiceStatus,
  type AgentCodOrder,
} from "../../../lib/unifiedApi";

type Settlement = typeof ShipInvoiceStatus.Posted | typeof ShipInvoiceStatus.Collected;

const PAGE_SIZE = 25;

// The courier's cash-on-delivery money, read only: settling it is done by the
// accounts team (an agent payment journal in the ERP) when the cash is handed over.
export function CodCollection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState(false);
  const [settlement, setSettlement] = useState<Settlement>(ShipInvoiceStatus.Posted);
  const [orders, setOrders] = useState<AgentCodOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [codTotal, setCodTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The ledger balance: positive means the courier still owes the company.
  useEffect(() => {
    if (!user?.partnerAccountId) return;
    let cancelled = false;
    setBalanceError(false);
    getAccountBalance(user.apiKey, user.partnerAccountId)
      .then((result) => {
        if (!cancelled) setBalance(result);
      })
      .catch(() => {
        if (!cancelled) setBalanceError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Page 1 replaces the list (first load, tab switch); later pages append to it.
  useEffect(() => {
    if (!user?.partnerAccountId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAgentCodOrders(user.apiKey, settlement, page, PAGE_SIZE)
      .then((result) => {
        if (cancelled) return;
        setOrders((current) => (page === 1 ? result.data : [...current, ...result.data]));
        setTotalCount(result.totalCount);
        setCodTotal(result.netAmount ?? 0);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t("common.networkError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, settlement, page, t]);

  function switchTo(next: Settlement) {
    if (next === settlement) return;
    setOrders([]);
    setTotalCount(0);
    setCodTotal(0);
    setPage(1);
    setSettlement(next);
  }

  const toHandOver = settlement === ShipInvoiceStatus.Posted;

  if (!user?.partnerAccountId) {
    return (
      <section className="page">
        <h1>{t("cod.title")}</h1>
        <div className="card">
          <p className="card__placeholder">{t("cod.unavailable")}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <h1>{t("cod.title")}</h1>

      <div className="card">
        <h2 className="order-detail__section-title">{t("cod.balance")}</h2>
        {balanceError && <p style={{ color: "var(--color-danger)" }}>{t("common.networkError")}</p>}
        {!balanceError && balance === null && <p className="card__placeholder">{t("common.loading")}</p>}
        {!balanceError && balance !== null && (
          <>
            <p className="account-balance__amount">{Math.abs(balance).toFixed(2)}</p>
            <p className="card__placeholder">
              {balance > 0 ? t("cod.youOwe") : balance < 0 ? t("cod.owedToYou") : t("cod.allSettled")}
            </p>
          </>
        )}
      </div>

      <div className="segmented" role="group" aria-label={t("cod.title")}>
        <button
          type="button"
          aria-pressed={toHandOver}
          className={`segmented__btn${toHandOver ? " segmented__btn--active" : ""}`}
          onClick={() => switchTo(ShipInvoiceStatus.Posted)}
        >
          {t("cod.toHandOver")}
        </button>
        <button
          type="button"
          aria-pressed={!toHandOver}
          className={`segmented__btn${!toHandOver ? " segmented__btn--active" : ""}`}
          onClick={() => switchTo(ShipInvoiceStatus.Collected)}
        >
          {t("cod.settled")}
        </button>
      </div>

      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      {!error && totalCount > 0 && (
        <p className="cod-summary">{t("cod.summary", { count: totalCount, amount: codTotal.toFixed(2) })}</p>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="card">
          <p className="card__placeholder">{toHandOver ? t("cod.none") : t("cod.noneSettled")}</p>
        </div>
      )}

      {orders.length > 0 && (
        <ul className="order-list">
          {orders.map((order) => (
            <li key={order.orderId} className="order-list__item">
              <div className="order-list__row">
                <span className="order-list__id">{order.orderId}</span>
                <span className="order-list__status">{order.orderStatus}</span>
              </div>
              <div className="order-list__row">
                <span className="order-list__contact">{order.contactName}</span>
                {order.dueDate && <span>{formatDate(order.dueDate)}</span>}
              </div>
              <div className="order-list__row">
                <span>
                  {t("cod.cod")}: {order.codAmount.toFixed(2)}
                </span>
                <span className="cod-amount">
                  {toHandOver ? t("cod.due") : t("cod.handedOver")}: {order.agentAmount.toFixed(2)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {loading && <p className="card__placeholder">{t("common.loading")}</p>}

      {!loading && !error && orders.length < totalCount && (
        <div className="order-list__pagination">
          <button type="button" onClick={() => setPage((p) => p + 1)}>
            {t("cod.loadMore")}
          </button>
        </div>
      )}

      <p className="cod-note">{t("cod.note")}</p>
    </section>
  );
}

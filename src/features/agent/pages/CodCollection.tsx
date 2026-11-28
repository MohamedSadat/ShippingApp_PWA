import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { Amount, DirectedAmount } from "../../../components/Amount";
import { Icon } from "../../../components/Icon";
import { StatusChip } from "../../../components/StatusChip";
import { useToast } from "../../../components/Toast";
import { cleanName } from "../../../lib/contact";
import { formatDate } from "../../../lib/formatDate";
import { formatMoney, moneyText } from "../../../lib/money";
import {
  getAccountBalance,
  getAgentCodOrders,
  ShipInvoiceStatus,
  type AgentCodOrder,
} from "../../../lib/unifiedApi";

type Settlement = typeof ShipInvoiceStatus.Posted | typeof ShipInvoiceStatus.Collected;

const PAGE_SIZE = 25;

/** The courier's fee on a shipment: what they keep out of the COD (agentAmount = COD − fee). */
function feeOf(order: AgentCodOrder): number {
  return Math.round((order.codAmount - order.agentAmount) * 100) / 100;
}

// The courier's cash-on-delivery money, read only: settling it is done by the
// accounts team (an agent payment journal in the ERP) when the cash is handed over.
// Ledger sign throughout: positive means the courier owes the company.
export function CodCollection() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState(false);
  const [settlement, setSettlement] = useState<Settlement>(ShipInvoiceStatus.Posted);
  const [orders, setOrders] = useState<AgentCodOrder[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [codTotal, setCodTotal] = useState(0);
  // COD total of the shipments still to hand over: the part of the balance the list explains.
  const [postedCod, setPostedCod] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        if (settlement === ShipInvoiceStatus.Posted) setPostedCod(result.netAmount ?? 0);
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
  const lang = i18n.language;

  async function shareStatement() {
    const direction = (value: number) => (value > 0 ? t("money.youOwe") : value < 0 ? t("money.owedToYou") : "");
    const lines = [
      `${t("cod.title")} · ${user?.name ?? ""}`,
      balance !== null ? `${t("cod.balance")}: ${moneyText(Math.abs(balance), lang)} ${direction(balance)}` : "",
      t("cod.summary", { count: totalCount, amount: moneyText(codTotal, lang) }),
      "",
      ...orders.map((o) => {
        const fee = feeOf(o);
        const net = `${moneyText(Math.abs(o.agentAmount), lang, { currency: false })} ${direction(o.agentAmount)}`;
        return fee
          ? `${o.orderId}: ${formatMoney(o.codAmount, lang, { currency: false })} − ${formatMoney(fee, lang, { currency: false })} = ${net}`
          : `${o.orderId}: ${net}`;
      }),
    ];
    const text = lines.filter((line, i) => line || i === 3).join("\n");
    try {
      if (navigator.share) {
        await navigator.share({ title: t("cod.title"), text });
        return;
      }
      await navigator.clipboard.writeText(text);
      showToast(t("cod.copied"));
    } catch (err) {
      // The user closing the share sheet isn't an error worth reporting.
      if (err instanceof DOMException && err.name === "AbortError") return;
      showToast(t("cod.shareFailed"), "error");
    }
  }

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

  const otherEntries = balance !== null && postedCod !== null ? Math.round((balance - postedCod) * 100) / 100 : null;

  return (
    <section className="page">
      <h1>{t("cod.title")}</h1>

      <div className="card balance-card">
        <h2 className="balance-card__label">{t("cod.balance")}</h2>
        {balanceError && <p style={{ color: "var(--color-danger)" }}>{t("common.networkError")}</p>}
        {!balanceError && balance === null && <p className="card__placeholder">{t("common.loading")}</p>}
        {!balanceError && balance !== null && (
          <>
            <DirectedAmount value={balance} positiveMeans="youOwe" className="balance-card__amount" />
            {Math.round(balance * 100) === 0 && <p className="card__placeholder">{t("cod.allSettled")}</p>}
            {otherEntries !== null && (
              <dl className="breakdown">
                <div className="breakdown__row">
                  <dt>{t("cod.codToHandOver")}</dt>
                  <dd>
                    <DirectedAmount value={postedCod ?? 0} positiveMeans="youOwe" />
                  </dd>
                </div>
                <div className="breakdown__row">
                  <dt>{t("cod.feesAndOther")}</dt>
                  <dd>
                    <DirectedAmount value={otherEntries} positiveMeans="youOwe" />
                  </dd>
                </div>
                <div className="breakdown__row breakdown__row--total">
                  <dt>{t("cod.balanceTotal")}</dt>
                  <dd>
                    <DirectedAmount value={balance} positiveMeans="youOwe" />
                  </dd>
                </div>
              </dl>
            )}
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
        <div className="cod-summary-row">
          <p className="cod-summary">{t("cod.summary", { count: totalCount, amount: moneyText(codTotal, lang) })}</p>
          <button type="button" className="icon-text-btn" onClick={shareStatement}>
            <Icon name="share" size={18} />
            {t("cod.share")}
          </button>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <div className="card">
          <p className="card__placeholder">{toHandOver ? t("cod.none") : t("cod.noneSettled")}</p>
        </div>
      )}

      {orders.length > 0 && (
        <ul className="order-list">
          {orders.map((order) => {
            const fee = feeOf(order);
            return (
              <li key={order.orderId} className="order-list__item">
                <div className="order-list__row">
                  <span className="order-list__id">{order.orderId}</span>
                  <StatusChip status={order.orderStatus} />
                </div>
                <div className="order-list__row">
                  <span className="order-list__contact">{cleanName(order.contactName)}</span>
                  {order.dueDate && <span>{formatDate(order.dueDate)}</span>}
                </div>
                <div className="cod-math">
                  <span className="cod-math__label">{toHandOver ? t("cod.due") : t("cod.handedOver")}</span>
                  <span className="cod-math__sum">
                    {fee !== 0 && (
                      <span className="cod-math__terms">
                        <Amount value={order.codAmount} currency={false} />
                        {" − "}
                        <Amount value={fee} currency={false} /> {t("cod.fee")} =
                      </span>
                    )}
                    <DirectedAmount value={order.agentAmount} positiveMeans="youOwe" className="cod-amount" />
                  </span>
                </div>
              </li>
            );
          })}
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

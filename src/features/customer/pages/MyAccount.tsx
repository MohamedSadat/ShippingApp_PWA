import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { formatDate } from "../../../lib/formatDate";
import { openPdfInNewTab } from "../../../lib/pdfFile";
import {
  getAccountBalance,
  getStatementPdf,
  getStatements,
  getTransactions,
  PartnerTransType,
  StatementStatus,
  type PartnerStatement,
  type PartnerTransWindow,
} from "../../../lib/unifiedApi";

type Tab = "statements" | "transactions";

// The ledger keeps what the company owes a merchant as a negative amount. This
// page shows the merchant's side, like the statement PDF: owed to you is positive.
const yours = (ledger: number) => -ledger;
const money = (value: number) => value.toFixed(2);

// yyyy-mm-dd in local time, for <input type="date"> and the API's from/to.
function isoDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

export function MyAccount() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("statements");

  useEffect(() => {
    if (!user?.partnerAccountId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAccountBalance(user.apiKey, user.partnerAccountId)
      .then((result) => {
        if (!cancelled) setBalance(result);
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

  const owed = balance === null ? 0 : yours(balance);

  return (
    <section className="page">
      <h1>{t("myAccount.title")}</h1>
      <div className="card">
        <p className="card__placeholder">{user?.name}</p>
        <p className="card__placeholder">{user?.company}</p>
      </div>

      <div className="card">
        <h2 className="order-detail__section-title">{t("myAccount.balance")}</h2>
        {loading && <p className="card__placeholder">{t("common.loading")}</p>}
        {!loading && error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}
        {!loading && !error && !user?.partnerAccountId && (
          <p className="card__placeholder">{t("myAccount.balanceUnavailable")}</p>
        )}
        {!loading && !error && user?.partnerAccountId && balance !== null && (
          <>
            <p className="account-balance__amount">{money(Math.abs(owed))}</p>
            <p className="card__placeholder">
              {owed > 0 ? t("myAccount.owedToYou") : owed < 0 ? t("myAccount.youOwe") : t("myAccount.allSettled")}
            </p>
          </>
        )}
      </div>

      {user?.partnerAccountId && (
        <>
          <div className="segmented" role="group" aria-label={t("myAccount.title")}>
            <button
              type="button"
              aria-pressed={tab === "statements"}
              className={`segmented__btn${tab === "statements" ? " segmented__btn--active" : ""}`}
              onClick={() => setTab("statements")}
            >
              {t("myAccount.statements")}
            </button>
            <button
              type="button"
              aria-pressed={tab === "transactions"}
              className={`segmented__btn${tab === "transactions" ? " segmented__btn--active" : ""}`}
              onClick={() => setTab("transactions")}
            >
              {t("myAccount.transactions")}
            </button>
          </div>

          {tab === "statements" ? (
            <Statements apiKey={user.apiKey} accountId={user.partnerAccountId} />
          ) : (
            <Transactions apiKey={user.apiKey} accountId={user.partnerAccountId} />
          )}

          <p className="cod-note">{t("myAccount.sideNote")}</p>
        </>
      )}
    </section>
  );
}

interface AccountProps {
  apiKey: string;
  accountId: string;
}

// The weekly statements the company has sent, each with its PDF.
function Statements({ apiKey, accountId }: AccountProps) {
  const { t } = useTranslation();
  const [statements, setStatements] = useState<PartnerStatement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [printing, setPrinting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    getStatements(apiKey, accountId)
      .then((result) => {
        if (!cancelled) setStatements(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t("common.networkError"));
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey, accountId, t]);

  function statusText(status: StatementStatus) {
    if (status === StatementStatus.Agreed) return t("myAccount.statusAgreed");
    if (status === StatementStatus.Disputed) return t("myAccount.statusDisputed");
    return t("myAccount.statusSent");
  }

  // openPdfInNewTab opens the tab before its first await, so it must run straight from the click.
  async function openPdf(statementId: string) {
    setError(null);
    setPrinting(statementId);
    try {
      await openPdfInNewTab(() => getStatementPdf(apiKey, statementId), `Statement_${statementId}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.networkError"));
    } finally {
      setPrinting(null);
    }
  }

  if (error) return <p style={{ color: "var(--color-danger)", marginTop: 12 }}>{error}</p>;
  if (statements === null) return <p className="card__placeholder">{t("common.loading")}</p>;
  if (statements.length === 0)
    return (
      <div className="card" style={{ marginTop: 12 }}>
        <p className="card__placeholder">{t("myAccount.noStatements")}</p>
      </div>
    );

  return (
    <ul className="order-list">
      {statements.map((s) => (
        <li key={s.statementId} className="order-list__item">
          <div className="order-list__row">
            <span className="order-list__id">
              {formatDate(s.periodFrom)} – {formatDate(s.periodTo)}
            </span>
            <span className="order-list__status">{statusText(s.status)}</span>
          </div>
          <div className="order-list__row">
            <span>
              {t("myAccount.weekClosing")}: {money(yours(s.closing))}
            </span>
            <span>{t("myAccount.dueOn", { date: formatDate(s.dueDate) })}</span>
          </div>
          <div className="order-list__row">
            <span className="cod-amount">
              {t("myAccount.stillDue")}: {money(yours(s.unpaid))}
            </span>
            {s.heldAmount !== 0 && (
              <span>
                {t("myAccount.held")}: {money(s.heldAmount)}
              </span>
            )}
          </div>
          {s.overdue > 0 && (
            <div className="order-list__row">
              <span style={{ color: "var(--color-danger)" }}>{t("myAccount.overdue", { amount: money(s.overdue) })}</span>
            </div>
          )}
          <div className="order-list__pagination" style={{ justifyContent: "flex-end", marginTop: 8 }}>
            <button type="button" disabled={printing !== null} onClick={() => openPdf(s.statementId)}>
              {printing === s.statementId ? t("myAccount.openingPdf") : t("myAccount.openPdf")}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

// The ledger between two dates, with the balance before, after each row and at the end.
function Transactions({ apiKey, accountId }: AccountProps) {
  const { t } = useTranslation();
  const [from, setFrom] = useState(() => isoDate(new Date(Date.now() - 30 * 86_400_000)));
  const [to, setTo] = useState(() => isoDate(new Date()));
  const [range, setRange] = useState({ from, to });
  const [ledger, setLedger] = useState<PartnerTransWindow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getTransactions(apiKey, accountId, range.from, range.to)
      .then((result) => {
        if (!cancelled) setLedger(result);
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
  }, [apiKey, accountId, range, t]);

  function show(e: FormEvent) {
    e.preventDefault();
    setRange({ from, to });
  }

  return (
    <>
      <form className="scan-form" onSubmit={show}>
        <label htmlFor="trans-from">{t("myAccount.from")}</label>
        <input id="trans-from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} required />
        <label htmlFor="trans-to">{t("myAccount.to")}</label>
        <input id="trans-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} required />
        <button type="submit" disabled={loading}>
          {t("myAccount.show")}
        </button>
      </form>

      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}
      {loading && <p className="card__placeholder">{t("common.loading")}</p>}

      {!loading && !error && ledger && (
        <>
          <p className="cod-summary">
            {t("myAccount.openingBalance")}: {money(yours(ledger.opening))}
          </p>
          {ledger.rows.length === 0 && (
            <div className="card" style={{ marginTop: 12 }}>
              <p className="card__placeholder">{t("myAccount.noTransactions")}</p>
            </div>
          )}
          {ledger.rows.length > 0 && (
            <ul className="order-list">
              {ledger.rows.map((row, index) => (
                <li key={`${index}-${row.documentId ?? ""}`} className="order-list__item">
                  <div className="order-list__row">
                    <span className="order-list__id">{row.invoice ?? row.documentId}</span>
                    <span className="order-list__status">
                      {row.transType === PartnerTransType.Payment ? t("myAccount.payment") : t("myAccount.shipmentOrFee")}
                    </span>
                  </div>
                  <div className="order-list__row">
                    <span>{formatDate(row.transDate)}</span>
                    <span className="cod-amount">{money(yours(row.amount))}</span>
                  </div>
                  <div className="order-list__row">
                    <span className="order-list__contact">{row.text}</span>
                    <span>
                      {t("myAccount.balanceAfter")}: {money(yours(row.balance))}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="cod-summary">
            {t("myAccount.closingBalance")}: {money(yours(ledger.closing))}
          </p>
        </>
      )}
    </>
  );
}

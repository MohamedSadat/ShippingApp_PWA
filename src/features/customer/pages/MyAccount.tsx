import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { Amount, DirectedAmount } from "../../../components/Amount";
import { cleanName, cleanPhone, formatPhone } from "../../../lib/contact";
import { formatDate } from "../../../lib/formatDate";
import { moneyText } from "../../../lib/money";
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
// page shows the merchant's side, like the statement PDF: owed to you is positive,
// and every amount says which way it goes (لك / عليك) instead of carrying a sign.
const yours = (ledger: number) => -ledger;

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
  // Movements always have rows; statements are empty for most of the week.
  const [tab, setTab] = useState<Tab>("transactions");

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
  // Login fills userName with the account's display name (the business), name with the
  // sign-in (a merchant's phone) and company with the shipping company it belongs to.
  const business = cleanName(user?.userName);
  const signIn = user?.name ?? "";
  const shippingCompany = cleanName(user?.company);

  return (
    <section className="page">
      <h1>{t("myAccount.title")}</h1>
      <dl className="card info-rows">
        {business && (
          <div className="info-rows__row">
            <dt>{t("myAccount.business")}</dt>
            <dd>{business}</dd>
          </div>
        )}
        {signIn && signIn !== business && (
          <div className="info-rows__row">
            <dt>{t("myAccount.signIn")}</dt>
            <dd>
              <bdi dir="ltr">{cleanPhone(signIn).length >= 10 ? formatPhone(signIn) : signIn}</bdi>
            </dd>
          </div>
        )}
        {shippingCompany && (
          <div className="info-rows__row">
            <dt>{t("myAccount.shippingCompany")}</dt>
            <dd>{shippingCompany}</dd>
          </div>
        )}
      </dl>

      <div className="card balance-card">
        <h2 className="balance-card__label">{t("money.yourBalance")}</h2>
        {loading && <p className="card__placeholder">{t("common.loading")}</p>}
        {!loading && error && <p className="inline-error">{error}</p>}
        {!loading && !error && !user?.partnerAccountId && (
          <p className="card__placeholder">{t("myAccount.balanceUnavailable")}</p>
        )}
        {!loading && !error && user?.partnerAccountId && balance !== null && (
          <>
            <DirectedAmount value={owed} positiveMeans="owedToYou" className="balance-card__amount" />
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
              aria-pressed={tab === "transactions"}
              className={`segmented__btn${tab === "transactions" ? " segmented__btn--active" : ""}`}
              onClick={() => setTab("transactions")}
            >
              {t("myAccount.transactions")}
            </button>
            <button
              type="button"
              aria-pressed={tab === "statements"}
              className={`segmented__btn${tab === "statements" ? " segmented__btn--active" : ""}`}
              onClick={() => setTab("statements")}
            >
              {t("myAccount.statements")}
            </button>
          </div>

          {tab === "statements" ? (
            <Statements apiKey={user.apiKey} accountId={user.partnerAccountId} />
          ) : (
            <Transactions apiKey={user.apiKey} accountId={user.partnerAccountId} />
          )}
        </>
      )}
    </section>
  );
}

interface AccountProps {
  apiKey: string;
  accountId: string;
}

/** Statements are weekly: the next one covers the week after the latest period. */
function nextStatementDate(latest: PartnerStatement | undefined): Date | null {
  if (!latest) return null;
  const next = new Date(latest.periodTo);
  next.setDate(next.getDate() + 7);
  return next;
}

// The weekly statements the company has sent, each with its PDF.
function Statements({ apiKey, accountId }: AccountProps) {
  const { t, i18n } = useTranslation();
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

  if (error) return <p className="inline-error">{error}</p>;
  if (statements === null) return <p className="card__placeholder">{t("common.loading")}</p>;
  if (statements.length === 0)
    return (
      <div className="card" style={{ marginTop: 12 }}>
        <p className="card__placeholder">{t("myAccount.noStatements")}</p>
      </div>
    );

  const next = nextStatementDate(statements[0]);

  return (
    <>
      {next && <p className="cod-summary list-empty">{t("myAccount.nextStatement", { date: formatDate(next) })}</p>}
      <ul className="order-list">
        {statements.map((s) => (
          <li key={s.statementId} className="order-list__item">
            <div className="order-list__row">
              <span className="order-list__id">
                <bdi dir="ltr">
                  {formatDate(s.periodFrom)} – {formatDate(s.periodTo)}
                </bdi>
              </span>
              <span className="order-list__status">{statusText(s.status)}</span>
            </div>
            <div className="order-list__row">
              <span>{t("myAccount.weekClosing")}</span>
              <DirectedAmount value={yours(s.closing)} positiveMeans="owedToYou" />
            </div>
            <div className="order-list__row">
              <span>
                {t("myAccount.stillDue")} · {t("myAccount.dueOn", { date: formatDate(s.dueDate) })}
              </span>
              <DirectedAmount value={yours(s.unpaid)} positiveMeans="owedToYou" className="cod-amount" />
            </div>
            {s.heldAmount !== 0 && (
              <div className="order-list__row">
                <span>{t("myAccount.held")}</span>
                <Amount value={s.heldAmount} />
              </div>
            )}
            {s.overdue > 0 && (
              <div className="order-list__row">
                <span style={{ color: "var(--color-danger)" }}>
                  {t("myAccount.overdue", { amount: moneyText(s.overdue, i18n.language) })}
                </span>
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
    </>
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
      <form className="date-range" onSubmit={show}>
        <label>
          <span>{t("myAccount.from")}</span>
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} required />
        </label>
        <label>
          <span>{t("myAccount.to")}</span>
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} required />
        </label>
        <button type="submit" disabled={loading}>
          {t("myAccount.show")}
        </button>
      </form>

      {error && <p className="inline-error">{error}</p>}
      {loading && <p className="card__placeholder">{t("common.loading")}</p>}

      {!loading && !error && ledger && (
        <>
          <div className="ledger-edge">
            <span>{t("myAccount.openingBalance")}</span>
            <DirectedAmount value={yours(ledger.opening)} positiveMeans="owedToYou" />
          </div>
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
                    <bdi dir="ltr" className="order-list__id">
                      {row.invoice ?? row.documentId}
                    </bdi>
                    <span className="order-list__status">
                      {row.transType === PartnerTransType.Payment ? t("myAccount.payment") : t("myAccount.shipmentOrFee")}
                    </span>
                  </div>
                  <div className="order-list__row">
                    <span>{formatDate(row.transDate)}</span>
                    <DirectedAmount value={yours(row.amount)} positiveMeans="owedToYou" className="cod-amount" />
                  </div>
                  <div className="order-list__row">
                    <span className="order-list__contact">{row.text}</span>
                    <span className="ledger-after">
                      {t("myAccount.balanceAfter")} <DirectedAmount value={yours(row.balance)} positiveMeans="owedToYou" />
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="ledger-edge">
            <span>{t("myAccount.closingBalance")}</span>
            <DirectedAmount value={yours(ledger.closing)} positiveMeans="owedToYou" />
          </div>
        </>
      )}
    </>
  );
}

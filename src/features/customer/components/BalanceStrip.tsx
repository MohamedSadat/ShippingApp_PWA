import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { DirectedAmount } from "../../../components/Amount";
import { formatDate } from "../../../lib/formatDate";
import { getAccountBalance, getStatements, type PartnerStatement } from "../../../lib/unifiedApi";

/** A figure not loaded yet (undefined) or that failed to load (null). */
type Figure<T> = T | null | undefined;

// The ledger keeps what the company owes a merchant as a negative amount; this strip shows
// the merchant's side, like My Account: owed to you is positive.
const yours = (ledger: number) => -ledger;

/**
 * "Your balance with the company" and the next payout (what the latest weekly statement
 * leaves unpaid, and when it falls due), in the same words as My Account. Opens My Account.
 * Hidden for a user with no partner account.
 */
export function BalanceStrip() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [balance, setBalance] = useState<Figure<number>>();
  const [latest, setLatest] = useState<Figure<PartnerStatement | false>>();
  const accountId = user?.partnerAccountId;

  useEffect(() => {
    if (!user || !accountId) return;
    let cancelled = false;
    // One failing mustn't hide the other.
    void Promise.allSettled([getAccountBalance(user.apiKey, accountId), getStatements(user.apiKey, accountId)]).then(
      ([balanceResult, statementsResult]) => {
        if (cancelled) return;
        setBalance(
          balanceResult.status === "fulfilled" && typeof balanceResult.value === "number"
            ? yours(balanceResult.value)
            : null,
        );
        // Latest week first; false = no statement yet.
        setLatest(statementsResult.status === "fulfilled" ? (statementsResult.value?.[0] ?? false) : null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [user, accountId]);

  if (!accountId) return null;

  const placeholder = (figure: unknown) => (figure === undefined ? "…" : "—");
  const payout = latest ? yours(latest.unpaid) : 0;

  return (
    <Link to="/customer/account" className="dash-balance">
      <span className="dash-balance__column">
        <span className="dash-balance__label">{t("money.yourBalance")}</span>
        <span className="dash-balance__value">
          {typeof balance === "number" ? (
            <DirectedAmount value={balance} positiveMeans="owedToYou" />
          ) : (
            placeholder(balance)
          )}
        </span>
      </span>
      <span className="dash-balance__divider" aria-hidden="true" />
      <span className="dash-balance__column">
        <span className="dash-balance__label">{t("money.nextPayout")}</span>
        <span className="dash-balance__value">
          {latest && payout > 0 ? (
            <DirectedAmount value={payout} positiveMeans="owedToYou" />
          ) : latest === false || (latest && payout <= 0) ? (
            <span className="dash-balance__none">{t("money.noPayoutDue")}</span>
          ) : (
            placeholder(latest)
          )}
        </span>
        {latest && payout > 0 && (
          <span className="dash-balance__sub">{t("myAccount.dueOn", { date: formatDate(latest.dueDate) })}</span>
        )}
      </span>
    </Link>
  );
}

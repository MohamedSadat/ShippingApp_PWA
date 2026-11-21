import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { getAccountBalance, getStatements } from "../../../lib/unifiedApi";

/** A figure not loaded yet (undefined) or that failed to load (null). */
type Figure = number | null | undefined;

// The ledger keeps what the company owes a merchant as a negative amount; this strip shows
// the merchant's side, like My Account: owed to you is positive.
const yours = (ledger: number) => -ledger;

/**
 * The account's balance and what the latest statement leaves unpaid, from the merchant's
 * side. Opens My Account. Hidden for a user with no partner account.
 */
export function BalanceStrip() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [balance, setBalance] = useState<Figure>();
  const [due, setDue] = useState<Figure>();
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
        // Latest week first; no statement yet means nothing is due.
        setDue(statementsResult.status === "fulfilled" ? yours(statementsResult.value?.[0]?.unpaid ?? 0) : null);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [user, accountId]);

  if (!accountId) return null;

  const show = (figure: Figure) => (figure === undefined ? "…" : figure === null ? "—" : figure.toFixed(2));

  return (
    <Link to="/customer/account" className="dash-balance">
      <span className="dash-balance__column">
        <span className="dash-balance__label">{t("dashboard.totalBalance")}</span>
        <span className="dash-balance__value">{show(balance)}</span>
      </span>
      <span className="dash-balance__divider" aria-hidden="true" />
      <span className="dash-balance__column">
        <span className="dash-balance__label">{t("dashboard.dueForPayment")}</span>
        <span className="dash-balance__value">{show(due)}</span>
      </span>
    </Link>
  );
}

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { getAccountBalance } from "../../../lib/unifiedApi";

export function MyAccount() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <p className="account-balance__amount">{balance.toFixed(2)}</p>
        )}
      </div>
    </section>
  );
}

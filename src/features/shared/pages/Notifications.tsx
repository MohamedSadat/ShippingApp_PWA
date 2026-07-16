import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { disablePush, enablePush, getPushSubscription, isIosNotInstalled, isPushSupported } from "../../../lib/pushNotifications";

export function Notifications() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supported = isPushSupported();
  const needsIosInstall = isIosNotInstalled();

  useEffect(() => {
    if (!supported) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    getPushSubscription()
      .then((sub) => {
        if (!cancelled) setSubscribed(sub !== null);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supported]);

  async function handleToggle() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      if (subscribed) {
        await disablePush(user.apiKey);
        setSubscribed(false);
      } else {
        await enablePush(user.apiKey);
        setSubscribed(true);
      }
    } catch {
      setError(t("notifications.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page">
      <h1>{t("notifications.title")}</h1>
      <div className="card">
        {needsIosInstall ? (
          <p className="card__placeholder">{t("notifications.iosInstallRequired")}</p>
        ) : !supported ? (
          <p className="card__placeholder">{t("notifications.unsupported")}</p>
        ) : checking ? (
          <p className="card__placeholder">{t("common.loading")}</p>
        ) : (
          <>
            <p>{subscribed ? t("notifications.enabled") : t("notifications.disabled")}</p>
            <button onClick={handleToggle} disabled={busy}>
              {busy ? t("common.loading") : subscribed ? t("notifications.disable") : t("notifications.enable")}
            </button>
            {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}
          </>
        )}
      </div>
    </section>
  );
}

import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { Icon, type IconName } from "../../../components/Icon";
import { LanguageSwitcher } from "../../../components/LanguageSwitcher";
import { ThemeSwitcher } from "../../../components/ThemeSwitcher";
import { useToast } from "../../../components/Toast";
import { PLAY_STORE_URL, PORTAL_URL } from "../../../lib/appLinks";
import { cleanName } from "../../../lib/contact";
import { formatDateTime } from "../../../lib/formatDate";
import { isIosNotInstalled } from "../../../lib/pushNotifications";
import { lastScanSync, syncScanQueue, useUnsentPickups } from "../../../lib/useScanQueueSync";

// iPadOS reports itself as a Mac; touch points give it away.
const isIos =
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/** A settings row: leading icon, label (and optional detail), trailing chevron or external mark. */
function Row({ icon, label, detail, external }: { icon: IconName; label: string; detail?: string; external?: boolean }) {
  return (
    <>
      <Icon name={icon} size={22} className="settings-row__icon" />
      <span className="settings-row__text">
        <span>{label}</span>
        {detail && <span className="settings-row__detail">{detail}</span>}
      </span>
      <Icon name={external ? "external" : "chevron"} size={18} className={external ? "settings-row__end" : "settings-row__end dash-row__chevron"} />
    </>
  );
}

function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="settings-section">
      {title && <h2 className="settings-section__title">{title}</h2>}
      <div className="settings-list">{children}</div>
    </section>
  );
}

export function Settings() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const settingsPath = `/${user?.role ?? "customer"}/settings`;
  const isAgent = user?.role === "agent";
  // Agents only: customers never queue scans.
  const unsent = useUnsentPickups();
  const unsentCount = isAgent ? (unsent?.length ?? 0) : 0;
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(lastScanSync);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  async function syncNow() {
    if (!user) return;
    setSyncing(true);
    try {
      const { failed } = await syncScanQueue(user.apiKey);
      setLastSync(lastScanSync());
      showToast(failed > 0 ? t("settings.syncPartial") : t("settings.syncDone"), failed > 0 ? "notice" : "success");
    } catch {
      showToast(t("common.networkError"), "error");
    } finally {
      setSyncing(false);
    }
  }

  const name = cleanName(user?.name) || user?.userName;
  const company = cleanName(user?.company);

  return (
    <section className="page">
      <h1>{t("settings.title")}</h1>

      <div className="card account-card">
        <span className="account-card__avatar">
          <Icon name="user" size={28} />
        </span>
        <span className="account-card__text">
          <strong>{name}</strong>
          {company && company !== name && <span>{company}</span>}
          <span className="account-card__role">{t(`settings.role.${user?.role ?? "customer"}`)}</span>
        </span>
      </div>

      {isAgent && (
        <div className={`card sync-card${unsentCount > 0 ? " sync-card--pending" : ""}`}>
          <div className="sync-card__text">
            <strong>
              {unsentCount > 0 ? t("settings.unsent", { count: unsentCount }) : t("settings.allSynced")}
            </strong>
            <span>
              {lastSync ? t("settings.lastSync", { time: formatDateTime(lastSync) }) : t("settings.neverSynced")}
            </span>
          </div>
          <button type="button" className="icon-text-btn" onClick={syncNow} disabled={syncing}>
            <Icon name="refresh" size={18} className={syncing ? "spin" : undefined} />
            {t("settings.syncNow")}
          </button>
        </div>
      )}

      <Section title={t("settings.preferences")}>
        <div className="settings-row settings-row--control">
          <Icon name="globe" size={22} className="settings-row__icon" />
          <span className="settings-row__text">{t("settings.language")}</span>
          <LanguageSwitcher />
        </div>
        <div className="settings-row settings-row--stacked">
          <span className="settings-row__head">
            <Icon name="sun" size={22} className="settings-row__icon" />
            <span className="settings-row__text">{t("theme.title")}</span>
          </span>
          <ThemeSwitcher labels />
        </div>
      </Section>

      <Section title={t("settings.account")}>
        <Link to={`${settingsPath}/notifications`} className="settings-row">
          <Row icon="bell" label={t("settings.notifications")} />
        </Link>
        <Link to={`${settingsPath}/password`} className="settings-row">
          <Row icon="lock" label={t("settings.changePassword")} />
        </Link>
      </Section>

      <Section title={t("settings.more")}>
        <a href={PORTAL_URL} target="_blank" rel="noopener noreferrer" className="settings-row">
          <Row icon="globe" label={t("settings.portal")} detail="www.cashgearerp.com" external />
        </a>
        {!isIos && (
          <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="settings-row">
            <Row icon="smartphone" label={t("settings.androidApp")} external />
          </a>
        )}
        {isIosNotInstalled() && (
          <div className="settings-row settings-row--info">
            <Icon name="smartphone" size={22} className="settings-row__icon" />
            <span className="settings-row__text">
              <span>{t("settings.addToHome")}</span>
              <span className="settings-row__detail">{t("settings.addToHomeHow")}</span>
            </span>
          </div>
        )}
      </Section>

      {confirmingSignOut ? (
        <div className="card signout-confirm" role="alertdialog" aria-labelledby="signout-title">
          <p id="signout-title" className="signout-confirm__title">
            {t("settings.signOutConfirm")}
          </p>
          {unsentCount > 0 && <p className="inline-error">{t("settings.signOutUnsent", { count: unsentCount })}</p>}
          <div className="signout-confirm__buttons">
            <button type="button" className="settings-signout settings-signout--danger" onClick={signOut}>
              {t("settings.signOut")}
            </button>
            <button type="button" className="scan-actions__reset" onClick={() => setConfirmingSignOut(false)}>
              {t("scanDelivery.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="settings-signout" onClick={() => setConfirmingSignOut(true)}>
          <Icon name="logout" size={20} />
          {t("settings.signOut")}
        </button>
      )}

      <p className="settings-version">
        {t("settings.version", { version: __APP_VERSION__, build: __APP_BUILD__ })}
      </p>
    </section>
  );
}

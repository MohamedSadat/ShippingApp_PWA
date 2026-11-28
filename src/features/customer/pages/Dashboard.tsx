import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { CompanyLogo } from "../../../components/CompanyLogo";
import { Icon, type IconName } from "../../../components/Icon";
import { cleanName } from "../../../lib/contact";
import { getPartnerPendingOrders } from "../../../lib/unifiedApi";
import { BalanceStrip } from "../components/BalanceStrip";
import { DashboardStats } from "../components/DashboardStats";

const ROWS: { to: string; icon: IconName; labelKey: string; pending?: boolean }[] = [
  { to: "/customer/shipments?segment=active", icon: "box", labelKey: "dashboard.inProgress", pending: true },
  { to: "/customer/shipments/new", icon: "plus", labelKey: "dashboard.newShipment" },
  { to: "/customer/track", icon: "qr", labelKey: "dashboard.track" },
  { to: "/customer/account", icon: "wallet", labelKey: "dashboard.account" },
];

export function Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  // How many shipments are in progress; the list itself lives under My shipments.
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getPartnerPendingOrders(user.apiKey, 1, 1)
      .then((result) => {
        if (!cancelled) setPendingCount(result.totalCount);
      })
      .catch(() => {
        if (!cancelled) setPendingCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // The same business name My Account shows (login's userName is the display name).
  const name = cleanName(user?.userName) || cleanName(user?.name);

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h1>{t("dashboard.title")}</h1>
          {name && <p className="page-head__sub">{t("dashboard.welcome", { name })}</p>}
        </div>
        <CompanyLogo url={user?.companyLogoUrl} alt={user?.company} className="company-logo company-logo--small" />
      </div>

      <DashboardStats />
      <BalanceStrip />

      <section className="dash-section" aria-labelledby="dash-shipments-title">
        <h2 id="dash-shipments-title" className="dash-section__title">
          {t("dashboard.shipments")}
        </h2>
        <nav className="dash-rows">
          {ROWS.map((row) => (
            <Link key={row.to} to={row.to} className="dash-row">
              <Icon name={row.icon} className="dash-row__icon" />
              <span className="dash-row__label">{t(row.labelKey)}</span>
              {row.pending && pendingCount !== null && <span className="dash-row__count">{pendingCount}</span>}
              <Icon name="chevron" size={20} className="dash-row__chevron" />
            </Link>
          ))}
        </nav>
      </section>
    </section>
  );
}

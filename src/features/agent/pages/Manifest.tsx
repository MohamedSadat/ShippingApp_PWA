import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { Amount } from "../../../components/Amount";
import { CompanyLogo } from "../../../components/CompanyLogo";
import { ContactActions } from "../../../components/ContactActions";
import { Icon } from "../../../components/Icon";
import { FilterChips, SearchField, type ChipOption } from "../../../components/ListControls";
import { StatusChip } from "../../../components/StatusChip";
import { addressLines } from "../../../lib/address";
import { cleanName, cleanPhone, formatPhone, mapsHref } from "../../../lib/contact";
import { formatDateTime } from "../../../lib/formatDate";
import { moneyText } from "../../../lib/money";
import { STATUS_TONES, statusTone, TONE_COLOR, type StatusTone } from "../../../lib/statusTone";
import { getPartnerPendingOrders, type ShipOrderDto } from "../../../lib/unifiedApi";

const PAGE_SIZE = 30;

interface Snapshot {
  orders: ShipOrderDto[];
  totalCount: number;
  syncedAt: string;
  /** The last page loaded, and whether it came back full (only then can there be another). */
  page?: number;
  hasMore?: boolean;
}

// The last list that loaded, so a courier who opens the app with no signal still sees their stops.
const snapshotKey = (userName: string) => `shippingapp.manifest.${userName}`;

function readSnapshot(userName: string): Snapshot | null {
  try {
    const raw = localStorage.getItem(snapshotKey(userName));
    return raw ? (JSON.parse(raw) as Snapshot) : null;
  } catch {
    return null;
  }
}

function writeSnapshot(userName: string, snapshot: Snapshot) {
  try {
    localStorage.setItem(snapshotKey(userName), JSON.stringify(snapshot));
  } catch {
    // Storage full or blocked: the list still shows, it just won't survive going offline.
  }
}

export function Manifest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [snapshot, setSnapshot] = useState<Snapshot | null>(() => (user ? readSnapshot(user.userName) : null));
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tone, setTone] = useState<StatusTone | "all">("all");

  const load = useCallback(
    async (page: number) => {
      if (!user) return;
      setError(null);
      try {
        const result = await getPartnerPendingOrders(user.apiKey, page, PAGE_SIZE);
        setSnapshot((current) => {
          const previous = page === 1 ? [] : (current?.orders ?? []);
          const seen = new Set(previous.map((o) => o.orderId));
          const orders = [...previous, ...result.data.filter((o) => !seen.has(o.orderId))];
          const next: Snapshot = {
            orders,
            totalCount: result.totalCount,
            syncedAt: new Date().toISOString(),
            page,
            // The server's totalCount can run ahead of the rows it returns, so a short page ends the list.
            hasMore: result.data.length === PAGE_SIZE && orders.length < result.totalCount,
          };
          writeSnapshot(user.userName, next);
          return next;
        });
      } catch {
        setError(t("common.networkError"));
      }
    },
    [user, t],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load(1).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function refresh() {
    setLoading(true);
    await load(1);
    setLoading(false);
  }

  async function loadMore() {
    if (!snapshot) return;
    setLoadingMore(true);
    await load((snapshot.page ?? 1) + 1);
    setLoadingMore(false);
  }

  const orders = useMemo(() => snapshot?.orders ?? [], [snapshot]);
  const codToCollect = orders.reduce((sum, o) => sum + (o.codAmount || 0), 0);

  const toneOptions = useMemo<ChipOption<StatusTone | "all">[]>(() => {
    const counts = new Map<StatusTone, number>();
    for (const o of orders) {
      const tn = statusTone(o.orderStatus);
      counts.set(tn, (counts.get(tn) ?? 0) + 1);
    }
    const present = [...STATUS_TONES, "unknown" as const].filter((tn) => counts.has(tn));
    return [
      { value: "all", label: t("statusGroup.all"), count: orders.length },
      ...present.map((tn) => ({ value: tn, label: t(`statusGroup.${tn}`), count: counts.get(tn), color: TONE_COLOR[tn] })),
    ];
  }, [orders, t]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    return orders.filter((o) => {
      if (tone !== "all" && statusTone(o.orderStatus) !== tone) return false;
      if (!q) return true;
      const name = (o.contactName || o.toAddressModel?.contactName || "").toLowerCase();
      const phone = cleanPhone(o.contactPhone || o.toAddressModel?.phone);
      return o.orderId.toLowerCase().includes(q) || name.includes(q) || (qDigits.length >= 3 && phone.includes(qDigits));
    });
  }, [orders, query, tone]);

  const agentName = cleanName(user?.userName) || cleanName(user?.name);
  const hasMore = snapshot?.hasMore ?? false;
  // Count what's listed; the server total only while more pages are still to come.
  const stopCount = hasMore ? (snapshot?.totalCount ?? 0) : orders.length;

  return (
    <section className="page">
      <div className="page-head">
        <div>
          <h1>{t("manifest.title")}</h1>
          {agentName && <p className="page-head__sub">{t("manifest.agent", { name: agentName })}</p>}
        </div>
        <CompanyLogo url={user?.companyLogoUrl} alt={user?.company} className="company-logo company-logo--small" />
      </div>

      {snapshot && (
        <div className="summary-strip" role="status">
          <span className="summary-strip__main">
            {t("manifest.summary", { count: stopCount, amount: moneyText(codToCollect, lang) })}
          </span>
          <span className="summary-strip__meta">
            {t("manifest.updated", { time: formatDateTime(snapshot.syncedAt) })}
            <button
              type="button"
              className="summary-strip__refresh"
              onClick={refresh}
              disabled={loading}
              aria-label={t("manifest.refresh")}
              title={t("manifest.refresh")}
            >
              <Icon name="refresh" size={18} className={loading ? "spin" : undefined} />
            </button>
          </span>
        </div>
      )}

      {error && (
        <p className="inline-error" role="alert">
          {snapshot ? t("manifest.offlineCopy") : error}
        </p>
      )}
      {loading && !snapshot && <p className="card__placeholder">{t("manifest.loading")}</p>}

      {snapshot && orders.length === 0 && (
        <div className="card">
          <p className="card__placeholder">{t("manifest.noStops")}</p>
        </div>
      )}

      {orders.length > 0 && (
        <>
          <SearchField value={query} onChange={setQuery} placeholder={t("manifest.search")} />
          {toneOptions.length > 2 && (
            <FilterChips options={toneOptions} value={tone} onChange={setTone} label={t("shipmentGrid.status")} />
          )}
          {visible.length === 0 && <p className="card__placeholder list-empty">{t("manifest.noMatch")}</p>}
          <ul className="order-list">
            {visible.map((order) => {
              const contact = cleanName(order.contactName || order.toAddressModel?.contactName);
              const phone = order.contactPhone || order.toAddressModel?.phone;
              const { street, area } = addressLines(order, lang);
              return (
                <li
                  key={order.orderId}
                  className="order-list__item order-list__item--clickable stop-card"
                  onClick={() => navigate(`/agent/scan?mode=delivery&waybill=${encodeURIComponent(order.orderId)}`)}
                >
                  <div className="stop-card__top">
                    <span className="order-list__id">{order.orderId}</span>
                    {order.codAmount > 0 ? (
                      <Amount value={order.codAmount} className="stop-card__cod" />
                    ) : (
                      <span className="stop-card__no-cod">{t("manifest.noCod")}</span>
                    )}
                  </div>
                  <StatusChip status={order.orderStatus} />
                  {(contact || cleanPhone(phone)) && (
                    <p className="stop-card__contact">
                      {contact}
                      {cleanPhone(phone) && (
                        <bdi dir="ltr" className="stop-card__phone">
                          {formatPhone(phone)}
                        </bdi>
                      )}
                    </p>
                  )}
                  {(street || area) && (
                    <p className="stop-card__address">
                      {street && <span>{street}</span>}
                      {area && <span className="stop-card__area">{area}</span>}
                    </p>
                  )}
                  <ContactActions phone={phone} mapsUrl={mapsHref([street, area])} />
                </li>
              );
            })}
          </ul>
          {!loading && hasMore && (
            <div className="order-list__pagination">
              <button type="button" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? t("common.loading") : t("cod.loadMore")}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

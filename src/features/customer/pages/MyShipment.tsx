import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { Icon } from "../../../components/Icon";
import { FilterChips, SearchField, type ChipOption } from "../../../components/ListControls";
import { cleanPhone } from "../../../lib/contact";
import { openPdfInNewTab, saveBlob } from "../../../lib/pdfFile";
import { STATUS_TONES, statusTone, TONE_COLOR, type StatusTone } from "../../../lib/statusTone";
import {
  getPartnerCompletedOrders,
  getPartnerPendingOrders,
  getShipLabelsPdf,
  type ShipOrderDto,
} from "../../../lib/unifiedApi";
import { useMediaQuery } from "../../../lib/useMediaQuery";
import { ShipmentCardList } from "../components/ShipmentCardList";

const ShipmentGrid = lazy(() => import("../components/ShipmentGrid"));

const PAGE_SIZE = 30;
// Same cap as the web app's shipment grid, which enables Print below 25 selected.
const MAX_PRINT = 24;
const PDF_FILE_NAME = "ship.pdf";

export type Segment = "active" | "completed";
const PERIODS = ["all", "7", "30", "90"] as const;
type Period = (typeof PERIODS)[number];

/**
 * My shipments: Active (pending) and Completed lists. Pages are added with Load more,
 * so search and the status / period filters cover everything loaded. Reads
 * ?segment=&status=&days= so the Home tiles can open it already filtered.
 */
export function MyShipment() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const segment: Segment = params.get("segment") === "completed" ? "completed" : "active";
  const tone = (params.get("status") as StatusTone | null) ?? "all";
  const period: Period = (PERIODS as readonly string[]).includes(params.get("days") ?? "")
    ? (params.get("days") as Period)
    : "all";
  const phone = useMediaQuery("(max-width: 639px)");

  const [orders, setOrders] = useState<ShipOrderDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPageFull, setLastPageFull] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ShipOrderDto[]>([]);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

  const load = useCallback(
    async (page: number) => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        const fetchPage = segment === "active" ? getPartnerPendingOrders : getPartnerCompletedOrders;
        const result = await fetchPage(user.apiKey, page, PAGE_SIZE);
        setOrders((current) => {
          const previous = page === 1 ? [] : current;
          const seen = new Set(previous.map((o) => o.orderId));
          return [...previous, ...result.data.filter((o) => !seen.has(o.orderId))];
        });
        setTotalCount(result.totalCount);
        setPage(page);
        // The server's totalCount can run ahead of the rows it returns, so a short page ends the list.
        setLastPageFull(result.data.length === PAGE_SIZE);
      } catch {
        setError(t("common.networkError"));
      } finally {
        setLoading(false);
      }
    },
    [user, segment, t],
  );

  useEffect(() => {
    setOrders([]);
    setSelected([]);
    void load(1);
  }, [load]);

  // A filter that hides a selected shipment would still print it: start the selection over.
  useEffect(() => {
    setSelected([]);
  }, [tone, period, query]);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    if (key === "segment") next.delete("status");
    setParams(next, { replace: true });
    setSelected([]);
  }

  const toneOptions = useMemo<ChipOption<StatusTone | "all">[]>(() => {
    const counts = new Map<StatusTone, number>();
    for (const o of orders) {
      const tn = statusTone(o.orderStatus);
      counts.set(tn, (counts.get(tn) ?? 0) + 1);
    }
    const shown = [...STATUS_TONES, "unknown" as const].filter((tn) => counts.has(tn) || tn === tone);
    return [
      { value: "all", label: t("statusGroup.all"), count: orders.length },
      ...shown.map((tn) => ({ value: tn, label: t(`statusGroup.${tn}`), count: counts.get(tn) ?? 0, color: TONE_COLOR[tn] })),
    ];
  }, [orders, tone, t]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    const since = period === "all" ? null : Date.now() - Number(period) * 86_400_000;
    return orders.filter((o) => {
      if (tone !== "all" && statusTone(o.orderStatus) !== tone) return false;
      if (since !== null && (!o.orderDate || new Date(o.orderDate).getTime() < since)) return false;
      if (!q) return true;
      return (
        o.orderId.toLowerCase().includes(q) ||
        (o.contactName ?? "").toLowerCase().includes(q) ||
        (qDigits.length >= 3 && cleanPhone(o.contactPhone).includes(qDigits))
      );
    });
  }, [orders, query, tone, period]);

  const selectedIds = useMemo(() => new Set(selected.map((o) => o.orderId)), [selected]);

  function toggle(order: ShipOrderDto) {
    setSelected((current) =>
      current.some((o) => o.orderId === order.orderId)
        ? current.filter((o) => o.orderId !== order.orderId)
        : [...current, order],
    );
  }

  // `action` must reach any window.open synchronously — see openPdfInNewTab.
  async function runPrint(action: () => Promise<void>) {
    setPrintError(null);
    setPrinting(true);
    try {
      await action();
    } catch (err) {
      setPrintError(err instanceof Error ? err.message : t("common.networkError"));
    } finally {
      setPrinting(false);
    }
  }

  const loadLabels = () => getShipLabelsPdf(user!.apiKey, selected.map((order) => order.orderId));
  const tooMany = selected.length > MAX_PRINT;
  const canPrint = selected.length > 0 && !tooMany && !printing;

  return (
    <section className={`page${selected.length > 0 ? " page--with-action-bar" : ""}`}>
      <h1>{t("myShipment.title")}</h1>

      <div className="segmented" role="group" aria-label={t("myShipment.title")}>
        {(["active", "completed"] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={segment === s}
            className={`segmented__btn${segment === s ? " segmented__btn--active" : ""}`}
            onClick={() => setParam("segment", s)}
          >
            {t(`myShipment.${s}`)}
          </button>
        ))}
      </div>

      <SearchField value={query} onChange={setQuery} placeholder={t("myShipment.search")} />
      <FilterChips
        options={PERIODS.map((p) => ({ value: p, label: t(`myShipment.period.${p}`) }))}
        value={period}
        onChange={(p) => setParam("days", p === "all" ? null : p)}
        label={t("dashboard.period")}
      />
      {toneOptions.length > 2 && (
        <FilterChips
          options={toneOptions}
          value={tone}
          onChange={(tn) => setParam("status", tn === "all" ? null : tn)}
          label={t("shipmentGrid.status")}
        />
      )}

      {error && <p className="inline-error">{error}</p>}
      {loading && orders.length === 0 && <p className="card__placeholder list-empty">{t("myShipment.loading")}</p>}
      {!loading && !error && orders.length === 0 && (
        <div className="card">
          <p className="card__placeholder">
            {segment === "active" ? t("myShipment.noActive") : t("myShipment.noShipments")}
          </p>
        </div>
      )}
      {orders.length > 0 && visible.length === 0 && (
        <p className="card__placeholder list-empty">{t("myShipment.noMatch")}</p>
      )}

      {visible.length > 0 &&
        (phone ? (
          <ShipmentCardList orders={visible} selected={selectedIds} onToggle={toggle} />
        ) : (
          <div className="shipment-grid">
            <Suspense fallback={<p className="card__placeholder">{t("common.loading")}</p>}>
              <ShipmentGrid
                key={`${segment}-${tone}-${period}-${query}`}
                orders={visible}
                pageSize={visible.length}
                onSelectionChange={setSelected}
                ariaLabel={t("myShipment.title")}
              />
            </Suspense>
          </div>
        ))}

      {lastPageFull && orders.length < totalCount && (
        <div className="order-list__pagination">
          <button type="button" disabled={loading} onClick={() => void load(page + 1)}>
            {loading ? t("common.loading") : t("myShipment.loadMore", { shown: orders.length, total: totalCount })}
          </button>
        </div>
      )}

      {selected.length > 0 && (
        <div className="action-bar" role="region" aria-label={t("shipmentGrid.print")}>
          <div className="action-bar__head">
            <span>{printing ? t("shipmentGrid.printing") : t("shipmentGrid.selected", { count: selected.length })}</span>
            <button
              type="button"
              className="action-bar__clear"
              onClick={() => setSelected([])}
              aria-label={t("shipmentGrid.clear")}
            >
              <Icon name="x" size={18} />
            </button>
          </div>
          {tooMany && <p className="action-bar__hint">{t("shipmentGrid.printLimit", { max: MAX_PRINT })}</p>}
          {printError && <p className="action-bar__hint">{printError}</p>}
          <div className="action-bar__buttons">
            <button
              type="button"
              disabled={!canPrint}
              onClick={() => runPrint(() => openPdfInNewTab(loadLabels, PDF_FILE_NAME))}
            >
              <Icon name="printer" size={18} />
              {t("shipmentGrid.printLabels", { count: selected.length })}
            </button>
            <button
              type="button"
              className="action-bar__secondary"
              disabled={!canPrint}
              onClick={() => runPrint(async () => saveBlob(await loadLabels(), PDF_FILE_NAME))}
            >
              <Icon name="download" size={18} />
              {t("shipmentGrid.downloadPdf")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

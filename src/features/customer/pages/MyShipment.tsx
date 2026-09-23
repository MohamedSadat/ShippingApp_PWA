import { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { getPartnerCompletedOrders, getShipLabelsPdf, type ShipOrderDto } from "../../../lib/unifiedApi";
import { openPdfInNewTab, saveBlob } from "../../../lib/pdfFile";

const ShipmentGrid = lazy(() => import("../components/ShipmentGrid"));

const PAGE_SIZE = 30;
// Same cap as the web app's shipment grid, which enables Print below 25 selected.
const MAX_PRINT = 24;
const PDF_FILE_NAME = "ship.pdf";

export function MyShipment() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [orders, setOrders] = useState<ShipOrderDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ShipOrderDto[]>([]);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getPartnerCompletedOrders(user.apiKey, pageNumber, PAGE_SIZE)
      .then((result) => {
        if (cancelled) return;
        setOrders(result.data);
        setTotalCount(result.totalCount);
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
  }, [user, pageNumber, t]);

  // Selection is per page: the grid is keyed by page number, so paging remounts
  // it with nothing selected.
  function goToPage(page: number) {
    setSelected([]);
    setPrintError(null);
    setPageNumber(page);
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
  const handlePrint = () => runPrint(() => openPdfInNewTab(loadLabels, PDF_FILE_NAME));
  const handleDownload = () => runPrint(async () => saveBlob(await loadLabels(), PDF_FILE_NAME));

  const tooMany = selected.length > MAX_PRINT;
  const canPrint = selected.length > 0 && !tooMany && !printing;
  const hasNextPage = pageNumber * PAGE_SIZE < totalCount;

  return (
    <section className="page">
      <h1>{t("myShipment.title")}</h1>

      {loading && <p className="card__placeholder">{t("myShipment.loading")}</p>}
      {error && <p style={{ color: "var(--color-danger)" }}>{error}</p>}

      {!loading && !error && orders.length === 0 && (
        <div className="card">
          <p className="card__placeholder">{t("myShipment.noShipments")}</p>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <>
          <div className="shipment-toolbar">
            <span className="shipment-toolbar__count">
              {printing ? t("myShipment.printing") : t("myShipment.selected", { count: selected.length })}
            </span>
            <button type="button" disabled={!canPrint} onClick={handlePrint}>
              {t("myShipment.print")}
            </button>
            <button type="button" disabled={!canPrint} onClick={handleDownload}>
              {t("myShipment.download")}
            </button>
          </div>
          {tooMany && <p className="shipment-toolbar__hint">{t("myShipment.printLimit", { max: MAX_PRINT })}</p>}
          {printError && <p style={{ color: "var(--color-danger)", margin: "8px 0 0" }}>{printError}</p>}

          <div className="shipment-grid">
            <Suspense fallback={<p className="card__placeholder">{t("myShipment.loading")}</p>}>
              <ShipmentGrid
                key={pageNumber}
                orders={orders}
                pageSize={PAGE_SIZE}
                onSelectionChange={setSelected}
                ariaLabel={t("myShipment.title")}
              />
            </Suspense>
          </div>
        </>
      )}

      {!loading && !error && totalCount > 0 && (
        <div className="order-list__pagination">
          <button type="button" disabled={pageNumber <= 1} onClick={() => goToPage(pageNumber - 1)}>
            {t("myShipment.previous")}
          </button>
          <span>{t("myShipment.page", { page: pageNumber })}</span>
          <button type="button" disabled={!hasNextPage} onClick={() => goToPage(pageNumber + 1)}>
            {t("myShipment.next")}
          </button>
        </div>
      )}
    </section>
  );
}

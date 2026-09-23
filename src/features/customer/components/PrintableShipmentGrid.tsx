import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { getShipLabelsPdf, type ShipOrderDto } from "../../../lib/unifiedApi";
import { openPdfInNewTab, saveBlob } from "../../../lib/pdfFile";

const ShipmentGrid = lazy(() => import("./ShipmentGrid"));

// Same cap as the web app's shipment grid, which enables Print below 25 selected.
const MAX_PRINT = 24;
const PDF_FILE_NAME = "ship.pdf";

interface PrintableShipmentGridProps {
  /** One server page of orders. */
  orders: ShipOrderDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  ariaLabel: string;
}

// The shipment grid with its label Print / Download toolbar and server paging,
// shared by My Shipment and the Dashboard.
export function PrintableShipmentGrid({
  orders,
  totalCount,
  pageNumber,
  pageSize,
  onPageChange,
  ariaLabel,
}: PrintableShipmentGridProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<ShipOrderDto[]>([]);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);

  // Selection is per page: the grid is keyed by page number, so paging remounts
  // it with nothing selected.
  function goToPage(page: number) {
    setSelected([]);
    setPrintError(null);
    onPageChange(page);
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
  const hasNextPage = pageNumber * pageSize < totalCount;

  return (
    <>
      {orders.length > 0 && (
        <>
          <div className="shipment-toolbar">
            <span className="shipment-toolbar__count">
              {printing ? t("shipmentGrid.printing") : t("shipmentGrid.selected", { count: selected.length })}
            </span>
            <button type="button" disabled={!canPrint} onClick={handlePrint}>
              {t("shipmentGrid.print")}
            </button>
            <button type="button" disabled={!canPrint} onClick={handleDownload}>
              {t("shipmentGrid.download")}
            </button>
          </div>
          {tooMany && <p className="shipment-toolbar__hint">{t("shipmentGrid.printLimit", { max: MAX_PRINT })}</p>}
          {printError && <p style={{ color: "var(--color-danger)", margin: "8px 0 0" }}>{printError}</p>}

          <div className="shipment-grid">
            <Suspense fallback={<p className="card__placeholder">{t("common.loading")}</p>}>
              <ShipmentGrid
                key={pageNumber}
                orders={orders}
                pageSize={pageSize}
                onSelectionChange={setSelected}
                ariaLabel={ariaLabel}
              />
            </Suspense>
          </div>
        </>
      )}

      {totalCount > 0 && (
        <div className="order-list__pagination">
          <button type="button" disabled={pageNumber <= 1} onClick={() => goToPage(pageNumber - 1)}>
            {t("shipmentGrid.previous")}
          </button>
          <span>{t("shipmentGrid.page", { page: pageNumber })}</span>
          <button type="button" disabled={!hasNextPage} onClick={() => goToPage(pageNumber + 1)}>
            {t("shipmentGrid.next")}
          </button>
        </div>
      )}
    </>
  );
}

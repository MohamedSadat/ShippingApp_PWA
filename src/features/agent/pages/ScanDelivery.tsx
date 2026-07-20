import { lazy, Suspense, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { recordScan } from "../../../lib/scanQueue";
import { useScanQueueSync } from "../../../lib/useScanQueueSync";
import { getAllowedActions, updateWorkflow, type WorkflowAction } from "../../../lib/unifiedApi";

const BarcodeScanner = lazy(() =>
  import("../../../components/BarcodeScanner").then((m) => ({ default: m.BarcodeScanner })),
);

export function ScanDelivery() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [waybillId, setWaybillId] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [actions, setActions] = useState<WorkflowAction[] | null>(null);
  const [loadingActions, setLoadingActions] = useState(false);
  const [actionsError, setActionsError] = useState<string | null>(null);
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  useScanQueueSync();

  // TODO: POD photo capture — required-vs-optional is an open decision (see CLAUDE.md).
  async function loadActions(id: string) {
    if (!user) return;
    setLoadingActions(true);
    setActionsError(null);
    setActions(null);
    try {
      const result = await getAllowedActions(user.apiKey, id);
      setActions(result);
    } catch {
      setActionsError(t("scanDelivery.actionsError"));
    } finally {
      setLoadingActions(false);
    }
  }

  async function handleScan(e: FormEvent) {
    e.preventDefault();
    if (!waybillId) return;
    // The scanned/typed code is the orderId. Keep the offline scan queue …
    await recordScan("delivery", waybillId);
    setStatus(t("scanDelivery.queued", { id: waybillId }));
    // … and load the allowed workflow actions for that order (online).
    setOrderId(waybillId);
    setActionResult(null);
    setActionError(null);
    await loadActions(waybillId);
  }

  async function runAction(action: WorkflowAction) {
    if (!user || !orderId) return;
    setRunningActionId(action.targetStatusCode);
    setActionResult(null);
    setActionError(null);
    try {
      await updateWorkflow(user.apiKey, action.targetStatusCode, orderId);
      setActionResult(t("scanDelivery.actionSuccess"));
      await loadActions(orderId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("scanDelivery.actionError"));
    } finally {
      setRunningActionId(null);
    }
  }

  function reset() {
    setWaybillId("");
    setOrderId(null);
    setStatus(null);
    setActions(null);
    setActionsError(null);
    setActionResult(null);
    setActionError(null);
  }

  return (
    <section className="page">
      <h1>{t("scanDelivery.title")}</h1>
      {scanning ? (
        <Suspense fallback={<p className="card__placeholder">{t("barcodeScanner.loading")}</p>}>
          <BarcodeScanner
            onDetected={(text) => {
              setWaybillId(text);
              setScanning(false);
            }}
            onClose={() => setScanning(false)}
          />
        </Suspense>
      ) : (
        <>
          <form onSubmit={handleScan} className="scan-form">
            <label htmlFor="waybillId">{t("scanDelivery.waybillLabel")}</label>
            <input
              id="waybillId"
              value={waybillId}
              onChange={(e) => setWaybillId(e.target.value)}
              placeholder={t("scanDelivery.waybillPlaceholder")}
            />
            <button type="button" className="scan-form__scan-btn" onClick={() => setScanning(true)}>
              {t("barcodeScanner.scanButton")}
            </button>
            <button type="submit">{t("scanDelivery.submit")}</button>
          </form>
          {status && <p className="scan-form__status">{status}</p>}

          {orderId && (
            <div className="scan-actions">
              <h2 className="scan-actions__title">{t("scanDelivery.actionsTitle")}</h2>
              <span className="scan-actions__order">{orderId}</span>

              {loadingActions && <p className="card__placeholder">{t("scanDelivery.actionsLoading")}</p>}
              {actionsError && <p style={{ color: "var(--color-danger)" }}>{actionsError}</p>}

              {!loadingActions && !actionsError && actions && actions.length === 0 && (
                <p className="card__placeholder">{t("scanDelivery.noActions")}</p>
              )}

              {!loadingActions &&
                !actionsError &&
                actions?.map((action) => (
                  <button
                    key={action.targetStatusCode}
                    type="button"
                    onClick={() => runAction(action)}
                    disabled={runningActionId !== null}
                  >
                    {runningActionId === action.targetStatusCode
                      ? t("scanDelivery.actionRunning")
                      : action.buttonLabel}
                  </button>
                ))}

              {actionResult && <p className="scan-form__status">{actionResult}</p>}
              {actionError && <p style={{ color: "var(--color-danger)" }}>{actionError}</p>}

              <button type="button" className="scan-actions__reset" onClick={reset}>
                {t("scanDelivery.scanNext")}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

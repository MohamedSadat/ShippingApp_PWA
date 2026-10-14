import { lazy, Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { recordScan } from "../../../lib/scanQueue";
import { useScanQueueSync } from "../../../lib/useScanQueueSync";
import {
  ApiStatusError,
  getAllowedActions,
  getOrder,
  updateWorkflow,
  type ShipOrderDto,
  type WorkflowAction,
  type WorkflowInput,
} from "../../../lib/unifiedApi";
import { StatusActionPanel } from "../components/StatusActionPanel";
import { isHubOnly, needsPanel } from "../settlement";

const BarcodeScanner = lazy(() =>
  import("../../../components/BarcodeScanner").then((m) => ({ default: m.BarcodeScanner })),
);

export function ScanDelivery() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  // Arriving from the manifest prefills the waybill, but never auto-submits — recording
  // the delivery stays an explicit agent action.
  const [waybillId, setWaybillId] = useState(searchParams.get("waybill") ?? "");
  const [orderId, setOrderId] = useState<string | null>(null);
  // The contact to show, and the COD / freight a settlement action is checked against.
  const [order, setOrder] = useState<ShipOrderDto | null>(null);
  // The order version the agent's actions are based on; updateWorkflow refuses without it.
  const [rowVersion, setRowVersion] = useState<string | null>(null);
  // Set when the lookup is refused (403: another agent carries it) or finds nothing (404).
  // Without the order there's no version to act on, so the actions are hidden.
  const [orderError, setOrderError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [actions, setActions] = useState<WorkflowAction[] | null>(null);
  const [loadingActions, setLoadingActions] = useState(false);
  const [actionsError, setActionsError] = useState<string | null>(null);
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  // The action whose confirm panel is open (reason, amount or confirmation needed).
  const [selectedAction, setSelectedAction] = useState<WorkflowAction | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  useScanQueueSync();

  // TODO: POD photo capture — required-vs-optional is an open decision (see CLAUDE.md).
  // The order to show and settle against, and the version to send with an action.
  async function loadOrder(id: string): Promise<string | null> {
    if (!user) return null;
    setOrder(null);
    setRowVersion(null);
    setOrderError(null);
    try {
      const loaded = await getOrder(user.apiKey, id);
      setOrder(loaded);
      setRowVersion(loaded.rowVersion ?? null);
      return loaded.rowVersion ?? null;
    } catch (err) {
      if (err instanceof ApiStatusError && err.status === 403) setOrderError(t("scanDelivery.notAssigned"));
      else if (err instanceof ApiStatusError && err.status === 404) setOrderError(t("scanDelivery.notFound"));
      // Otherwise (offline, server error) leave the contact empty; runAction retries the lookup.
      return null;
    }
  }

  async function loadActions(id: string): Promise<WorkflowAction[] | null> {
    if (!user) return null;
    setLoadingActions(true);
    setActionsError(null);
    setActions(null);
    try {
      const result = await getAllowedActions(user.apiKey, id);
      setActions(result);
      return result;
    } catch {
      setActionsError(t("scanDelivery.actionsError"));
      return null;
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
    setSelectedAction(null);
    setActionResult(null);
    setActionError(null);
    await Promise.all([loadOrder(waybillId), loadActions(waybillId)]);
  }

  function chooseAction(action: WorkflowAction) {
    setActionResult(null);
    setActionError(null);
    if (needsPanel(action)) setSelectedAction(action);
    else void runAction(action);
  }

  async function runAction(action: WorkflowAction, input?: WorkflowInput) {
    if (!user || !orderId) return;
    setRunningActionId(action.targetStatusCode);
    setActionResult(null);
    setActionError(null);
    try {
      const version = rowVersion ?? (await loadOrder(orderId));
      if (!version) throw new Error(t("scanDelivery.actionError"));
      const result = await updateWorkflow(user.apiKey, action.targetStatusCode, orderId, version, input);
      setRowVersion(result.rowVersion);
      setSelectedAction(null);
      setActionResult(t("scanDelivery.actionSuccess"));
      await loadActions(orderId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("scanDelivery.actionError"));
      // A refusal (often 409: someone else moved the order) leaves the screen stale —
      // show the order's current version and actions so the agent picks again.
      const [, offered] = await Promise.all([loadOrder(orderId), loadActions(orderId)]);
      // Keep the panel, and what was typed in it, for a retry — unless the order
      // moved on and the action isn't offered any more.
      if (!offered?.some((a) => a.targetStatusCode === action.targetStatusCode)) setSelectedAction(null);
    } finally {
      setRunningActionId(null);
    }
  }

  function reset() {
    setWaybillId("");
    setOrderId(null);
    setOrder(null);
    setRowVersion(null);
    setOrderError(null);
    setStatus(null);
    setActions(null);
    setActionsError(null);
    setSelectedAction(null);
    setActionResult(null);
    setActionError(null);
  }

  const contactName = order?.contactName || null;

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
              name="waybillId"
              value={waybillId}
              onChange={(e) => setWaybillId(e.target.value)}
              placeholder={t("scanDelivery.waybillPlaceholder")}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
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
              {contactName && (
                <span className="scan-actions__contact">
                  {t("scanDelivery.contact")}: {contactName}
                </span>
              )}

              {orderError && <p style={{ color: "var(--color-danger)" }}>{orderError}</p>}
              {!orderError && loadingActions && <p className="card__placeholder">{t("scanDelivery.actionsLoading")}</p>}
              {!orderError && actionsError && <p style={{ color: "var(--color-danger)" }}>{actionsError}</p>}

              {!orderError && !loadingActions && !actionsError && actions && actions.length === 0 && (
                <p className="card__placeholder">{t("scanDelivery.noActions")}</p>
              )}

              {/* Stays mounted while the actions reload after a refusal, so the input survives. */}
              {!orderError && selectedAction && (
                <StatusActionPanel
                  key={selectedAction.targetStatusCode}
                  action={selectedAction}
                  orderId={orderId}
                  codAmount={order?.codAmount ?? null}
                  freightAmount={order?.freightAmount ?? null}
                  running={runningActionId !== null}
                  onSubmit={(input) => runAction(selectedAction, input)}
                  onCancel={() => setSelectedAction(null)}
                />
              )}

              {!orderError &&
                !loadingActions &&
                !actionsError &&
                !selectedAction &&
                actions?.map((action) =>
                  isHubOnly(action) ? (
                    // The site/account it needs can't be picked with a courier key.
                    <button key={action.targetStatusCode} type="button" className={action.cssClass ?? undefined} disabled>
                      {action.buttonLabel} · {t("scanDelivery.hubOnly")}
                    </button>
                  ) : (
                    <button
                      key={action.targetStatusCode}
                      type="button"
                      className={action.cssClass ?? undefined}
                      onClick={() => chooseAction(action)}
                      disabled={runningActionId !== null}
                    >
                      {runningActionId === action.targetStatusCode
                        ? t("scanDelivery.actionRunning")
                        : action.buttonLabel}
                    </button>
                  ),
                )}

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

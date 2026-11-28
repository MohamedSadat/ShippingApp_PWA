import { lazy, Suspense, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { Amount } from "../../../components/Amount";
import { ContactActions } from "../../../components/ContactActions";
import { StatusChip } from "../../../components/StatusChip";
import { useToast } from "../../../components/Toast";
import { addressLines } from "../../../lib/address";
import { cleanName, cleanPhone, formatPhone, mapsHref } from "../../../lib/contact";
import { recordScan } from "../../../lib/scanQueue";
import { scanError, scanSuccess } from "../../../lib/scanFeedback";
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
import { ScanEntry } from "../components/ScanEntry";
import { isHubOnly, needsPanel } from "../settlement";

const BarcodeScanner = lazy(() =>
  import("../../../components/BarcodeScanner").then((m) => ({ default: m.BarcodeScanner })),
);

export function DeliveryMode() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  // Arriving from the Today list prefills the waybill, but never auto-submits — opening
  // the shipment stays an explicit courier action. A camera scan opens it straight away.
  const [waybillId, setWaybillId] = useState(searchParams.get("waybill") ?? "");
  const [orderId, setOrderId] = useState<string | null>(null);
  // The contact to show, and the COD / freight a settlement action is checked against.
  const [order, setOrder] = useState<ShipOrderDto | null>(null);
  // The order version the agent's actions are based on; updateWorkflow refuses without it.
  const [rowVersion, setRowVersion] = useState<string | null>(null);
  // Set when the lookup is refused (403: another agent carries it) or finds nothing (404).
  // Without the order there's no version to act on, so the actions are hidden.
  const [orderError, setOrderError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [actions, setActions] = useState<WorkflowAction[] | null>(null);
  const [loadingActions, setLoadingActions] = useState(false);
  const [actionsError, setActionsError] = useState<string | null>(null);
  const [runningActionId, setRunningActionId] = useState<string | null>(null);
  // The action whose confirm panel is open (reason, amount or confirmation needed).
  const [selectedAction, setSelectedAction] = useState<WorkflowAction | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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

  async function open(code: string) {
    // The scanned/typed code is the orderId. The scan (time + place) is logged locally …
    void recordScan("delivery", code).catch(() => {});
    // … and the order and its allowed workflow actions are loaded (online).
    setOrderId(code);
    setSelectedAction(null);
    setActionResult(null);
    setActionError(null);
    const [version] = await Promise.all([loadOrder(code), loadActions(code)]);
    if (version) scanSuccess();
    else {
      scanError();
      showToast(t("scanDelivery.openFailed", { id: code }), "error");
    }
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
      setOrder((current) => (current ? { ...current, orderStatus: result.orderStatus } : current));
      scanSuccess();
      showToast(t("scanDelivery.actionDone", { id: orderId, status: result.orderStatus }));
      await loadActions(orderId);
    } catch (err) {
      scanError();
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
    setActions(null);
    setActionsError(null);
    setSelectedAction(null);
    setActionResult(null);
    setActionError(null);
  }

  if (scanning) {
    return (
      <Suspense fallback={<p className="card__placeholder">{t("barcodeScanner.loading")}</p>}>
        <BarcodeScanner
          onDetected={(text) => {
            setScanning(false);
            setWaybillId(text);
            void open(text.trim());
          }}
          onClose={() => setScanning(false)}
        />
      </Suspense>
    );
  }

  if (!orderId) {
    return (
      <ScanEntry
        value={waybillId}
        onChange={setWaybillId}
        onSubmit={(code) => void open(code)}
        onCamera={() => setScanning(true)}
        submitLabel={t("scanDelivery.open")}
      />
    );
  }

  const contact = cleanName(order?.contactName || order?.toAddressModel?.contactName);
  const phone = order?.contactPhone || order?.toAddressModel?.phone;
  const { street, area } = order ? addressLines(order, i18n.language) : { street: "", area: "" };

  return (
    <div className="scan-actions">
      <div className="delivery-card">
        <div className="stop-card__top">
          <bdi dir="ltr" className="order-list__id">
            {orderId}
          </bdi>
          {order && <StatusChip status={order.orderStatus} />}
        </div>
        {order && (
          <>
            <div className="delivery-card__cod">
              <span>{order.codAmount > 0 ? t("scanDelivery.codToCollect") : t("scanDelivery.noCod")}</span>
              {order.codAmount > 0 && <Amount value={order.codAmount} />}
            </div>
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
          </>
        )}
      </div>

      {orderError && <p className="inline-error">{orderError}</p>}
      {!orderError && loadingActions && <p className="card__placeholder">{t("scanDelivery.actionsLoading")}</p>}
      {!orderError && actionsError && <p className="inline-error">{actionsError}</p>}

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

      {!orderError && !loadingActions && !actionsError && !selectedAction && actions && actions.length > 0 && (
        <h2 className="scan-actions__title">{t("scanDelivery.actionsTitle")}</h2>
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
              {runningActionId === action.targetStatusCode ? t("scanDelivery.actionRunning") : action.buttonLabel}
            </button>
          ),
        )}

      {actionResult && <p className="scan-form__status">{actionResult}</p>}
      {actionError && <p className="inline-error">{actionError}</p>}

      <button type="button" className="scan-actions__reset" onClick={reset}>
        {t("scanDelivery.scanNext")}
      </button>
    </div>
  );
}

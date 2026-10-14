import { useEffect, useId, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import {
  getActionReasons,
  type ActionReason,
  type WorkflowAction,
  type WorkflowInput,
} from "../../../lib/unifiedApi";
import { settlementKind } from "../settlement";

interface StatusActionPanelProps {
  action: WorkflowAction;
  orderId: string;
  /** From the loaded order; null when the lookup didn't come back (the server still caps). */
  codAmount: number | null;
  freightAmount: number | null;
  running: boolean;
  onSubmit: (input: WorkflowInput) => void;
  onCancel: () => void;
}

// What the agent confirms before a status change that takes input or settles
// money. The server enforces the same rules (reason/amount gates, the COD and
// freight caps); checking here just saves a round trip and says it plainly.
export function StatusActionPanel({
  action,
  orderId,
  codAmount,
  freightAmount,
  running,
  onSubmit,
  onCancel,
}: StatusActionPanelProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const id = useId();
  const kind = settlementKind(action.transactionId);
  // Delivered always collects the full COD; collecting less is a partial delivery.
  const showAmount = kind === "partial" || kind === "failedPay" || (kind === null && action.requiresAmount);
  const amountMax = kind === "failedPay" ? freightAmount : kind === "partial" ? codAmount : null;
  const showReason = action.requiresReason || !!action.lookupId;

  const [amountText, setAmountText] = useState(() =>
    kind === "failedPay" && freightAmount !== null ? freightAmount.toFixed(2) : "",
  );
  const [reasons, setReasons] = useState<ActionReason[] | null>(null);
  const [reasonsError, setReasonsError] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!showReason || !user) return;
    let cancelled = false;
    setReasons(null);
    setReasonsError(false);
    getActionReasons(user.apiKey, orderId, action.targetStatusCode)
      .then((list) => {
        if (!cancelled) setReasons(list);
      })
      .catch(() => {
        if (!cancelled) setReasonsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [showReason, user, orderId, action.targetStatusCode]);

  // A required reason with nothing to pick from can't be sent; the hub has to set the list up.
  const noReasons = action.requiresReason && reasons !== null && reasons.length === 0;

  function readAmount(): number | undefined | null {
    if (!showAmount) {
      // The rule may still demand an amount: send the one the outcome implies.
      if (!action.requiresAmount) return undefined;
      if (kind === "deliver") return codAmount ?? undefined;
      if (kind === "failed") return 0;
      return undefined;
    }
    const text = amountText.trim();
    if (text === "") {
      // Blank failed-pay falls back to the freight on the server.
      if (kind === "failedPay") return undefined;
      setError(t("scanDelivery.amountRequired"));
      return null;
    }
    const value = Number(text);
    if (!Number.isFinite(value) || value < 0) {
      setError(t("scanDelivery.amountInvalid"));
      return null;
    }
    if (amountMax !== null && value > amountMax) {
      setError(t("scanDelivery.amountTooHigh", { max: amountMax.toFixed(2) }));
      return null;
    }
    return value;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (action.requiresReason && !reason) {
      setError(t("scanDelivery.reasonRequired"));
      return;
    }
    const actualCollected = readAmount();
    if (actualCollected === null) return;
    onSubmit({ reason: reason || undefined, actualCollected });
  }

  return (
    <form className="action-panel" onSubmit={handleSubmit} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="action-panel__title">
        {action.buttonLabel}
      </h3>

      {kind === "deliver" && (
        <p className="action-panel__note">
          {t("scanDelivery.collectFull", { amount: codAmount !== null ? codAmount.toFixed(2) : "—" })}
        </p>
      )}
      {kind === "failed" && <p className="action-panel__note">{t("scanDelivery.nothingCollected")}</p>}

      {showAmount && (
        <label className="action-panel__field">
          <span>{kind === "failedPay" ? t("scanDelivery.feeLabel") : t("scanDelivery.amountLabel")}</span>
          <input
            className="shipment-form__field"
            type="number"
            inputMode="decimal"
            min={0}
            max={amountMax ?? undefined}
            step="0.01"
            dir="ltr"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            required={kind !== "failedPay"}
          />
          {amountMax !== null && (
            <small className="action-panel__hint">{t("scanDelivery.amountMax", { max: amountMax.toFixed(2) })}</small>
          )}
        </label>
      )}

      {showReason && (
        <label className="action-panel__field">
          <span>{t("scanDelivery.reasonLabel")}</span>
          {reasons === null && !reasonsError && (
            <small className="action-panel__hint">{t("scanDelivery.reasonsLoading")}</small>
          )}
          {reasonsError && <small className="action-panel__error">{t("scanDelivery.reasonsError")}</small>}
          {noReasons && <small className="action-panel__error">{t("scanDelivery.noReasons")}</small>}
          {reasons !== null && reasons.length > 0 && (
            <select
              className="shipment-form__field"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required={action.requiresReason}
            >
              <option value="">{t("scanDelivery.reasonPlaceholder")}</option>
              {reasons.map((r) => {
                // The web app's status popup records the description as the reason text.
                const text = r.description || r.meaning;
                return (
                  <option key={r.code} value={text}>
                    {text}
                  </option>
                );
              })}
            </select>
          )}
        </label>
      )}

      {error && <p className="action-panel__error">{error}</p>}

      <button
        type="submit"
        className={action.cssClass ?? undefined}
        disabled={running || noReasons || (action.requiresReason && reasonsError)}
      >
        {running ? t("scanDelivery.actionRunning") : t("scanDelivery.confirm")}
      </button>
      <button type="button" className="scan-actions__reset" onClick={onCancel} disabled={running}>
        {t("scanDelivery.cancel")}
      </button>
    </form>
  );
}

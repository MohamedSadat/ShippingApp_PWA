import type { WorkflowAction } from "../../lib/unifiedApi";

/**
 * The delivery outcomes that post a settlement, by the action's transactionId
 * (backend ShipPostingTransactions). Each decides what the agent collects:
 * - deliver: the full COD (Delivered, Exchange) — nothing to enter
 * - partial: the amount actually collected, up to the COD
 * - failedPay: the receiver paid the freight only, up to the freight
 * - failed: nothing
 */
export type SettlementKind = "deliver" | "partial" | "failedPay" | "failed";

const KINDS: Record<string, SettlementKind> = {
  SHIP_DELIVER: "deliver",
  SHIP_EXCHANGE: "deliver",
  SHIP_PART_DELIVER: "partial",
  SHIP_FAILED_PAY: "failedPay",
  SHIP_FAILED: "failed",
};

export function settlementKind(transactionId: string | null | undefined): SettlementKind | null {
  return (transactionId && KINDS[transactionId.toUpperCase()]) || null;
}

/** Site and account pickers aren't open to a courier key, so these stay with the hub. */
export function isHubOnly(action: WorkflowAction): boolean {
  return action.requiresLocation || action.requiresAccount;
}

/**
 * Whether the action needs the confirm panel rather than a single tap: it takes
 * a reason or an amount, settles money, or the workflow asks to confirm it.
 */
export function needsPanel(action: WorkflowAction): boolean {
  return (
    action.requiresReason ||
    action.requiresAmount ||
    action.requiresConfirmation ||
    action.isFinal ||
    !!action.lookupId ||
    settlementKind(action.transactionId) !== null
  );
}

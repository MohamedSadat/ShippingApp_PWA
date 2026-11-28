import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { flushScanQueue, getUnsentPickups, SCAN_QUEUE_EVENT, type ScanEvent } from "./scanQueue";
import { ApiStatusError, scanPickup } from "./unifiedApi";

/** Statuses a later retry can fix: not signed in, timed out, rate limited. */
const RETRYABLE = new Set([401, 408, 429]);

const LAST_SYNC_KEY = "shippingapp.lastScanSync";

/**
 * Sends a pickup scan made offline. A scan the server refuses (wrong merchant, no open
 * pickup, already collected) can never succeed, so it leaves the queue instead of being
 * retried on every flush. Delivery scans have no ingest endpoint yet and stay queued.
 */
async function sendScanEvent(apiKey: string, event: ScanEvent): Promise<void> {
  if (event.type !== "pickup") throw new Error("UnifiedAPI delivery scan endpoint not wired up yet");
  try {
    await scanPickup(apiKey, event.waybillId);
  } catch (err) {
    if (err instanceof ApiStatusError && err.status >= 400 && err.status < 500 && !RETRYABLE.has(err.status)) {
      console.warn(`Pickup scan ${event.waybillId} refused: ${err.message}`);
      return;
    }
    throw err;
  }
}

/** Sends what's queued now (the Settings "Sync now" button and the automatic triggers). */
export async function syncScanQueue(apiKey: string): Promise<{ succeeded: number; failed: number }> {
  const result = await flushScanQueue((event) => sendScanEvent(apiKey, event));
  try {
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch {
    // Only the "last synced" label depends on this.
  }
  window.dispatchEvent(new Event(SCAN_QUEUE_EVENT));
  return result;
}

export function lastScanSync(): string | null {
  try {
    return localStorage.getItem(LAST_SYNC_KEY);
  } catch {
    return null;
  }
}

/**
 * Triggers a queue flush on app-foreground and online events.
 * There is no silent background flush on iOS Safari (no Background
 * Sync API) — this is the intended trigger point, not a fallback.
 */
export function useScanQueueSync(): void {
  const { user } = useAuth();
  const apiKey = user?.apiKey;

  useEffect(() => {
    if (!apiKey) return;
    const flush = () => {
      void syncScanQueue(apiKey);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") flush();
    };

    window.addEventListener("online", flush);
    document.addEventListener("visibilitychange", onVisibility);
    flush();

    return () => {
      window.removeEventListener("online", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [apiKey]);
}

/** Pickups waiting to be sent, kept current as the queue changes; null until first read. */
export function useUnsentPickups(): ScanEvent[] | null {
  const [pending, setPending] = useState<ScanEvent[] | null>(null);
  const refresh = useCallback(() => {
    getUnsentPickups()
      .then(setPending)
      .catch(() => setPending([]));
  }, []);
  useEffect(() => {
    refresh();
    window.addEventListener(SCAN_QUEUE_EVENT, refresh);
    return () => window.removeEventListener(SCAN_QUEUE_EVENT, refresh);
  }, [refresh]);
  return pending;
}

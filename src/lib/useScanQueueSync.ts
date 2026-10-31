import { useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { flushScanQueue, type ScanEvent } from "./scanQueue";
import { ApiStatusError, scanPickup } from "./unifiedApi";

/** Statuses a later retry can fix: not signed in, timed out, rate limited. */
const RETRYABLE = new Set([401, 408, 429]);

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
      void flushScanQueue((event) => sendScanEvent(apiKey, event));
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

import { useEffect } from "react";
import { flushScanQueue, type ScanEvent } from "./scanQueue";

/** TODO: replace with a real UnifiedAPI POST once the scan-ingest endpoint exists. */
async function sendScanEvent(event: ScanEvent): Promise<void> {
  void event;
  throw new Error("UnifiedAPI scan endpoint not wired up yet");
}

/**
 * Triggers a queue flush on app-foreground and online events.
 * There is no silent background flush on iOS Safari (no Background
 * Sync API) — this is the intended trigger point, not a fallback.
 */
export function useScanQueueSync(): void {
  useEffect(() => {
    const flush = () => {
      void flushScanQueue(sendScanEvent);
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
  }, []);
}

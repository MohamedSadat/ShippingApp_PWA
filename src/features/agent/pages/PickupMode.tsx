import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { Icon } from "../../../components/Icon";
import { useToast } from "../../../components/Toast";
import { cleanName } from "../../../lib/contact";
import { removeQueuedScan, recordScan } from "../../../lib/scanQueue";
import { scanError, scanNotice, scanSuccess } from "../../../lib/scanFeedback";
import { ApiStatusError, scanPickup } from "../../../lib/unifiedApi";
import { useUnsentPickups } from "../../../lib/useScanQueueSync";
import { ScanEntry } from "../components/ScanEntry";

const BarcodeScanner = lazy(() =>
  import("../../../components/BarcodeScanner").then((m) => ({ default: m.BarcodeScanner })),
);

type Outcome = "collected" | "already" | "queued" | "sent" | "error";

interface SessionItem {
  key: string;
  code: string;
  outcome: Outcome;
  contactName?: string;
  message?: string;
  /** Set while the scan sits in the offline queue: it can still be removed. */
  queueId?: number;
}

const SESSION_KEY = "shippingapp.pickupSession";
// The camera sees the same label many times a second; one scan per label per few seconds.
const REPEAT_WINDOW_MS = 3000;

function loadSession(): SessionItem[] {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "[]") as SessionItem[];
  } catch {
    return [];
  }
}

/**
 * Batch pickup: each scan goes straight to the courier's open pickup at the parcel's
 * merchant; a refusal is shown, not queued. Offline it is queued and sent when the app
 * is back. Everything scanned since the last Finish is listed below the scanner.
 */
export function PickupMode() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [items, setItems] = useState<SessionItem[]>(loadSession);
  const inFlight = useRef(new Set<string>());
  const lastSeen = useRef(new Map<string, number>());
  const unsent = useUnsentPickups();

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(items));
    } catch {
      // The list just won't survive a reload.
    }
  }, [items]);

  // A queued scan that has left the queue was sent.
  useEffect(() => {
    if (!unsent) return;
    const waiting = new Set(unsent.map((e) => e.id));
    setItems((current) =>
      current.some((i) => i.queueId !== undefined && !waiting.has(i.queueId))
        ? current.map((i) =>
            i.queueId !== undefined && !waiting.has(i.queueId) ? { ...i, outcome: "sent", queueId: undefined } : i,
          )
        : current,
    );
  }, [unsent]);

  function add(item: Omit<SessionItem, "key">) {
    setItems((current) => [{ ...item, key: `${item.code}-${Date.now()}` }, ...current]);
  }

  async function submit(raw: string) {
    const scanned = raw.trim();
    if (!scanned || !user) return;
    const now = Date.now();
    if (inFlight.current.has(scanned) || now - (lastSeen.current.get(scanned) ?? 0) < REPEAT_WINDOW_MS) return;
    lastSeen.current.set(scanned, now);
    inFlight.current.add(scanned);
    setCode("");
    try {
      const result = await scanPickup(user.apiKey, scanned);
      const contactName = cleanName(result.contactName);
      if (result.moved) {
        scanSuccess();
        showToast(t("scanPickup.collected", { id: result.orderId }));
        add({ code: result.orderId, outcome: "collected", contactName });
      } else {
        scanNotice();
        showToast(t("scanPickup.alreadyCollected", { id: result.orderId }), "notice");
        add({ code: result.orderId, outcome: "already", contactName });
      }
    } catch (err) {
      if (err instanceof ApiStatusError) {
        scanError();
        showToast(`${scanned}: ${err.message}`, "error");
        add({ code: scanned, outcome: "error", message: err.message });
        return;
      }
      const queueId = await recordScan("pickup", scanned);
      scanNotice();
      showToast(t("scanPickup.queued", { id: scanned }), "notice");
      add({ code: scanned, outcome: "queued", queueId });
    } finally {
      inFlight.current.delete(scanned);
    }
  }

  async function remove(item: SessionItem) {
    if (item.queueId === undefined) return;
    await removeQueuedScan(item.queueId);
    setItems((current) => current.filter((i) => i.key !== item.key));
    showToast(t("scanPickup.removed", { id: item.code }));
  }

  function finish() {
    setScanning(false);
    setItems([]);
    lastSeen.current.clear();
  }

  const picked = items.filter((i) => i.outcome !== "error" && i.outcome !== "already").length;

  return (
    <>
      {scanning ? (
        <Suspense fallback={<p className="card__placeholder">{t("barcodeScanner.loading")}</p>}>
          <p className="scan-hint">{t("scanPickup.cameraHint")}</p>
          <BarcodeScanner
            continuous
            closeLabel={t("barcodeScanner.done")}
            onDetected={(text) => void submit(text)}
            onClose={() => setScanning(false)}
          />
        </Suspense>
      ) : (
        <ScanEntry
          value={code}
          onChange={setCode}
          onSubmit={(c) => void submit(c)}
          onCamera={() => setScanning(true)}
          submitLabel={t("scanPickup.submit")}
        />
      )}

      {items.length > 0 && (
        <section className="scan-session" aria-labelledby="scan-session-title">
          <div className="scan-session__head">
            <h2 id="scan-session-title">{t("scanPickup.sessionTitle")}</h2>
            <span className="scan-session__count">{t("scanPickup.sessionCount", { count: picked })}</span>
          </div>
          <ul className="scan-session__list">
            {items.map((item) => (
              <li key={item.key} className={`scan-session__item scan-session__item--${item.outcome}`}>
                <Icon
                  name={item.outcome === "error" ? "failed" : item.outcome === "queued" ? "awaiting" : "check"}
                  size={20}
                  className="scan-session__icon"
                />
                <div className="scan-session__text">
                  <bdi dir="ltr" className="scan-session__code">
                    {item.code}
                  </bdi>
                  <span className="scan-session__detail">
                    {item.outcome === "error"
                      ? item.message
                      : [t(`scanPickup.outcome.${item.outcome}`), item.contactName].filter(Boolean).join(" · ")}
                  </span>
                </div>
                {item.queueId !== undefined && (
                  <button
                    type="button"
                    className="scan-session__undo"
                    onClick={() => void remove(item)}
                    aria-label={t("scanPickup.remove", { id: item.code })}
                  >
                    <Icon name="undo" size={18} />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <button type="button" className="scan-session__finish" onClick={finish}>
            {t("scanPickup.finish")}
          </button>
        </section>
      )}
    </>
  );
}

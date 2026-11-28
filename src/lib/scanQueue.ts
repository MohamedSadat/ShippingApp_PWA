const DB_NAME = "shippingapp";
const DB_VERSION = 1;
const STORE_NAME = "scanQueue";

export interface ScanEvent {
  id?: number;
  type: "pickup" | "delivery";
  waybillId: string;
  timestamp: string;
  lat: number | null;
  lng: number | null;
  podPhoto?: Blob;
  synced: boolean;
}

/** Fired on window whenever the queue changes (scan added, sent, removed). */
export const SCAN_QUEUE_EVENT = "scanqueuechange";

function notifyChange() {
  window.dispatchEvent(new Event(SCAN_QUEUE_EVENT));
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
        store.createIndex("synced", "synced");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Captures a one-time geolocation fix at the moment of scan.
 * Never blocks the write on GPS: if it fails or times out, the
 * scan is still queued with null coordinates.
 */
function getCurrentPositionSafe(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

/** Queues a scan; resolves to its queue id (for removing it before it's sent). */
export async function recordScan(
  type: ScanEvent["type"],
  waybillId: string,
  podPhoto?: Blob,
): Promise<number> {
  const position = await getCurrentPositionSafe();
  const event: ScanEvent = {
    type,
    waybillId,
    timestamp: new Date().toISOString(),
    lat: position?.coords.latitude ?? null,
    lng: position?.coords.longitude ?? null,
    podPhoto,
    synced: false,
  };

  const db = await openDb();
  const id = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const request = tx.objectStore(STORE_NAME).add(event);
    tx.oncomplete = () => resolve(request.result as number);
    tx.onerror = () => reject(tx.error);
  });
  notifyChange();
  return id;
}

/** Drops a scan that hasn't been sent yet (the courier undid it). */
export async function removeQueuedScan(id: number): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  notifyChange();
}

/**
 * Scans still waiting to reach the server. Only pickups count: delivery scans are a
 * local log with no ingest endpoint yet, so they would never leave this number.
 */
export async function getUnsentPickups(): Promise<ScanEvent[]> {
  return (await getPendingScans()).filter((e) => e.type === "pickup");
}

export async function getPendingScans(): Promise<ScanEvent[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result as ScanEvent[]).filter((e) => !e.synced));
    request.onerror = () => reject(request.error);
  });
}

async function markSynced(id: number): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const event = getRequest.result as ScanEvent | undefined;
      if (event) {
        event.synced = true;
        store.put(event);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * iOS Safari has no Background Sync API, so this must be called on
 * app-foreground / online events rather than relying on a service
 * worker to flush silently in the background.
 */
export async function flushScanQueue(
  send: (event: ScanEvent) => Promise<void>,
): Promise<{ succeeded: number; failed: number }> {
  const pending = await getPendingScans();
  let succeeded = 0;
  let failed = 0;

  for (const event of pending) {
    try {
      await send(event);
      if (event.id !== undefined) await markSynced(event.id);
      succeeded++;
    } catch {
      failed++;
    }
  }

  if (succeeded > 0) notifyChange();
  return { succeeded, failed };
}

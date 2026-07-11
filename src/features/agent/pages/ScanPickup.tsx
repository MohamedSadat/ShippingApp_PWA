import { useState, type FormEvent } from "react";
import { recordScan } from "../../../lib/scanQueue";
import { useScanQueueSync } from "../../../lib/useScanQueueSync";

export function ScanPickup() {
  const [waybillId, setWaybillId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  useScanQueueSync();

  // TODO: replace manual entry with camera getUserMedia + zxing-js /
  // html5-qrcode decode (BarcodeDetector on Android Chrome where available).
  async function handleScan(e: FormEvent) {
    e.preventDefault();
    if (!waybillId) return;
    await recordScan("pickup", waybillId);
    setStatus(`Pickup queued for ${waybillId}`);
    setWaybillId("");
  }

  return (
    <section className="page">
      <h1>Pickup scan</h1>
      <form onSubmit={handleScan} className="scan-form">
        <label htmlFor="waybillId">Waybill ID</label>
        <input
          id="waybillId"
          value={waybillId}
          onChange={(e) => setWaybillId(e.target.value)}
          placeholder="Scan or enter waybill ID"
        />
        <button type="submit">Record pickup</button>
      </form>
      {status && <p className="scan-form__status">{status}</p>}
    </section>
  );
}

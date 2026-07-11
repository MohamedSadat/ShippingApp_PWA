import { useState, type FormEvent } from "react";
import { recordScan } from "../../../lib/scanQueue";
import { useScanQueueSync } from "../../../lib/useScanQueueSync";

export function ScanDelivery() {
  const [waybillId, setWaybillId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  useScanQueueSync();

  // TODO: POD photo capture — required-vs-optional is an open decision (see CLAUDE.md).
  async function handleScan(e: FormEvent) {
    e.preventDefault();
    if (!waybillId) return;
    await recordScan("delivery", waybillId);
    setStatus(`Delivery queued for ${waybillId}`);
    setWaybillId("");
  }

  return (
    <section className="page">
      <h1>Delivery scan</h1>
      <form onSubmit={handleScan} className="scan-form">
        <label htmlFor="waybillId">Waybill ID</label>
        <input
          id="waybillId"
          value={waybillId}
          onChange={(e) => setWaybillId(e.target.value)}
          placeholder="Scan or enter waybill ID"
        />
        <button type="submit">Record delivery</button>
      </form>
      {status && <p className="scan-form__status">{status}</p>}
    </section>
  );
}

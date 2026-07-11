import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { recordScan } from "../../../lib/scanQueue";
import { useScanQueueSync } from "../../../lib/useScanQueueSync";

export function ScanPickup() {
  const { t } = useTranslation();
  const [waybillId, setWaybillId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  useScanQueueSync();

  // TODO: replace manual entry with camera getUserMedia + zxing-js /
  // html5-qrcode decode (BarcodeDetector on Android Chrome where available).
  async function handleScan(e: FormEvent) {
    e.preventDefault();
    if (!waybillId) return;
    await recordScan("pickup", waybillId);
    setStatus(t("scanPickup.queued", { id: waybillId }));
    setWaybillId("");
  }

  return (
    <section className="page">
      <h1>{t("scanPickup.title")}</h1>
      <form onSubmit={handleScan} className="scan-form">
        <label htmlFor="waybillId">{t("scanPickup.waybillLabel")}</label>
        <input
          id="waybillId"
          value={waybillId}
          onChange={(e) => setWaybillId(e.target.value)}
          placeholder={t("scanPickup.waybillPlaceholder")}
        />
        <button type="submit">{t("scanPickup.submit")}</button>
      </form>
      {status && <p className="scan-form__status">{status}</p>}
    </section>
  );
}

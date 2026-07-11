import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { recordScan } from "../../../lib/scanQueue";
import { useScanQueueSync } from "../../../lib/useScanQueueSync";

export function ScanDelivery() {
  const { t } = useTranslation();
  const [waybillId, setWaybillId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  useScanQueueSync();

  // TODO: POD photo capture — required-vs-optional is an open decision (see CLAUDE.md).
  async function handleScan(e: FormEvent) {
    e.preventDefault();
    if (!waybillId) return;
    await recordScan("delivery", waybillId);
    setStatus(t("scanDelivery.queued", { id: waybillId }));
    setWaybillId("");
  }

  return (
    <section className="page">
      <h1>{t("scanDelivery.title")}</h1>
      <form onSubmit={handleScan} className="scan-form">
        <label htmlFor="waybillId">{t("scanDelivery.waybillLabel")}</label>
        <input
          id="waybillId"
          value={waybillId}
          onChange={(e) => setWaybillId(e.target.value)}
          placeholder={t("scanDelivery.waybillPlaceholder")}
        />
        <button type="submit">{t("scanDelivery.submit")}</button>
      </form>
      {status && <p className="scan-form__status">{status}</p>}
    </section>
  );
}

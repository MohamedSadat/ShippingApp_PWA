import { lazy, Suspense, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { recordScan } from "../../../lib/scanQueue";
import { ApiStatusError, scanPickup } from "../../../lib/unifiedApi";
import { useScanQueueSync } from "../../../lib/useScanQueueSync";

const BarcodeScanner = lazy(() =>
  import("../../../components/BarcodeScanner").then((m) => ({ default: m.BarcodeScanner })),
);

export function ScanPickup() {
  const { t } = useTranslation();
  const [waybillId, setWaybillId] = useState("");
  const { user } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  useScanQueueSync();

  // Online the scan goes straight to the courier's open pickup at the parcel's merchant;
  // a refusal is shown, not queued. Offline it is queued and sent when the app is back.
  async function handleScan(e: FormEvent) {
    e.preventDefault();
    const code = waybillId.trim();
    if (!code || !user) return;
    setWaybillId("");
    try {
      const result = await scanPickup(user.apiKey, code);
      setError(null);
      setStatus(t(result.moved ? "scanPickup.collected" : "scanPickup.alreadyCollected", { id: result.orderId }));
    } catch (err) {
      if (err instanceof ApiStatusError) {
        setStatus(null);
        setError(err.message);
        return;
      }
      await recordScan("pickup", code);
      setError(null);
      setStatus(t("scanPickup.queued", { id: code }));
    }
  }

  return (
    <section className="page">
      <h1>{t("scanPickup.title")}</h1>
      {scanning ? (
        <Suspense fallback={<p className="card__placeholder">{t("barcodeScanner.loading")}</p>}>
          <BarcodeScanner
            onDetected={(text) => {
              setWaybillId(text);
              setScanning(false);
            }}
            onClose={() => setScanning(false)}
          />
        </Suspense>
      ) : (
        <>
          <form onSubmit={handleScan} className="scan-form">
            <label htmlFor="waybillId">{t("scanPickup.waybillLabel")}</label>
            <input
              id="waybillId"
              name="waybillId"
              value={waybillId}
              onChange={(e) => setWaybillId(e.target.value)}
              placeholder={t("scanPickup.waybillPlaceholder")}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <button type="button" className="scan-form__scan-btn" onClick={() => setScanning(true)}>
              {t("barcodeScanner.scanButton")}
            </button>
            <button type="submit">{t("scanPickup.submit")}</button>
          </form>
          {status && <p className="scan-form__status">{status}</p>}
          {error && (
            <p className="scan-form__status scan-form__status--error" role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </section>
  );
}

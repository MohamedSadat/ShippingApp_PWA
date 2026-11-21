import { lazy, Suspense, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { ApiStatusError, getOrder } from "../../../lib/unifiedApi";

const BarcodeScanner = lazy(() =>
  import("../../../components/BarcodeScanner").then((m) => ({ default: m.BarcodeScanner })),
);

/** Opens one of the customer's shipments by its number, typed or scanned off the label. */
export function TrackShipment() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function track(value: string) {
    const orderId = value.trim();
    if (!user || !orderId || busy) return;
    setBusy(true);
    setError(null);
    try {
      // GetPartnerOrder holds the key to the customer's own shipments: read it first so a
      // wrong number says so here rather than on an empty shipment page.
      const order = await getOrder(user.apiKey, orderId);
      navigate(`/customer/shipments/${encodeURIComponent(order.orderId)}`);
    } catch (err) {
      // 404 is no such shipment, 403 one placed by another account: both read as not found.
      setError(
        err instanceof ApiStatusError && (err.status === 404 || err.status === 403)
          ? t("track.notFound", { id: orderId })
          : t("common.networkError"),
      );
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void track(code);
  }

  return (
    <section className="page">
      <h1>{t("track.title")}</h1>
      <p className="card__placeholder">{t("track.hint")}</p>
      {scanning ? (
        <Suspense fallback={<p className="card__placeholder">{t("barcodeScanner.loading")}</p>}>
          <BarcodeScanner
            onDetected={(text) => {
              setScanning(false);
              setCode(text);
              void track(text);
            }}
            onClose={() => setScanning(false)}
          />
        </Suspense>
      ) : (
        <form onSubmit={handleSubmit} className="scan-form">
          <label htmlFor="trackCode">{t("track.number")}</label>
          <input
            id="trackCode"
            name="trackCode"
            dir="ltr"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(null);
            }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
          <button type="button" className="scan-form__scan-btn" onClick={() => setScanning(true)} disabled={busy}>
            {t("barcodeScanner.scanButton")}
          </button>
          <button type="submit" disabled={busy || !code.trim()}>
            {busy ? t("common.loading") : t("track.submit")}
          </button>
        </form>
      )}
      {error && <p className="scan-form__status scan-form__status--error">{error}</p>}
    </section>
  );
}

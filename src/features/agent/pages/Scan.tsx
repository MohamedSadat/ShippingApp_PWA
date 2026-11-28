import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useScanQueueSync } from "../../../lib/useScanQueueSync";
import { DeliveryMode } from "./DeliveryMode";
import { PickupMode } from "./PickupMode";

type Mode = "pickup" | "delivery";

/**
 * One Scan tab for both jobs, with the mode always visible at the top so a courier
 * can't record a delivery while thinking they're on pickups (or the other way round).
 */
export function Scan() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const mode: Mode = params.get("mode") === "delivery" || params.has("waybill") ? "delivery" : "pickup";
  useScanQueueSync();

  function switchTo(next: Mode) {
    if (next !== mode) setParams({ mode: next }, { replace: true });
  }

  return (
    <section className="page">
      <h1>{t("scan.title")}</h1>
      <div className="segmented segmented--large" role="group" aria-label={t("scan.modeLabel")}>
        {(["pickup", "delivery"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            className={`segmented__btn${mode === m ? " segmented__btn--active" : ""}`}
            onClick={() => switchTo(m)}
          >
            {t(`scan.${m}`)}
          </button>
        ))}
      </div>
      {/* Keyed so switching modes starts that mode fresh. */}
      {mode === "pickup" ? <PickupMode key="pickup" /> : <DeliveryMode key={`delivery-${params.get("waybill") ?? ""}`} />}
    </section>
  );
}

/** The old /agent/scan/pickup and /agent/scan/delivery links (bookmarks, notifications). */
export function LegacyScanRedirect({ mode }: { mode: Mode }) {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  params.set("mode", mode);
  return <Navigate to={`/agent/scan?${params.toString()}`} replace />;
}

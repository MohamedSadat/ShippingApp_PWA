import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { MaskedInput } from "../../../components/MaskedInput";
import {
  ApiStatusError,
  getGovs,
  getZones,
  updateDraftOrder,
  type ShipGov,
  type ShipOrderDto,
  type ShipZone,
} from "../../../lib/unifiedApi";
import { PHONE_MASK } from "../shipmentFields";

interface EditShipmentFormProps {
  order: ShipOrderDto;
  onSaved: () => void;
  /** The shipment changed since it was read (409). The form can't help: read it again first. */
  onConflict: () => void;
  onCancel: () => void;
}

/**
 * The customer's correction of a draft shipment: COD, receiver, address. The server decides
 * when this applies (order.canEditDraft) and reprices the freight for a new destination.
 *
 * Not Add Shipment's form: that one always starts a new order, and clears the zone whenever
 * the governorate changes, which would wipe a prefilled zone. Here the zone is only cleared
 * when the customer picks another governorate.
 */
export function EditShipmentForm({ order, onSaved, onConflict, onCancel }: EditShipmentFormProps) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const address = order.toAddressModel;

  const [govs, setGovs] = useState<ShipGov[]>([]);
  const [zones, setZones] = useState<ShipZone[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [govId, setGovId] = useState(address?.goveId ? String(address.goveId) : "");
  const [zoneId, setZoneId] = useState(address?.zoneId ? String(address.zoneId) : "");
  const [street, setStreet] = useState(address?.street ?? "");
  const [contactName, setContactName] = useState(order.contactName ?? "");
  const [contactPhone, setContactPhone] = useState(order.contactPhone ?? "");
  const [contactPhone2, setContactPhone2] = useState(order.contactPhone2 ?? "");
  const [codAmount, setCodAmount] = useState(String(order.codAmount));
  const [allowOpen, setAllowOpen] = useState(order.allowOpen ?? false);

  // Decided once, from what is stored. The mask would show only the first 11 digits of a
  // longer imported number while keeping them all, and a number that came from Shopify or
  // Excel shouldn't block changing the COD. So that number opens in a plain field.
  const [phoneFitsMask] = useState(() => !order.contactPhone || /^\d{11}$/.test(order.contactPhone));

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getGovs(user.apiKey)
      .then((list) => {
        if (cancelled) return;
        setGovs(list);
        // A select showing a value it has no option for would show one thing and send another.
        setGovId((current) => (list.some((gov) => String(gov.goveId) === current) ? current : ""));
      })
      .catch(() => {
        if (!cancelled) setLoadError(t("common.networkError"));
      });
    return () => {
      cancelled = true;
    };
  }, [user, t]);

  useEffect(() => {
    if (!user || !govId) {
      setZones([]);
      setZoneId("");
      return;
    }
    let cancelled = false;
    getZones(user.apiKey, Number(govId))
      .then((list) => {
        if (cancelled) return;
        setZones(list);
        setZoneId((current) => (list.some((zone) => String(zone.zoneId) === current) ? current : ""));
      })
      .catch(() => {
        if (!cancelled) setLoadError(t("common.networkError"));
      });
    return () => {
      cancelled = true;
    };
  }, [user, govId, t]);

  function handleGovChange(value: string) {
    setGovId(value);
    setZones([]);
    setZoneId("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSubmitting(true);
    try {
      await updateDraftOrder(user.apiKey, {
        orderId: order.orderId,
        // Blank is refused by the server with a message, rather than failing silently here.
        rowVersion: order.rowVersion ?? "",
        codAmount: Number(codAmount),
        allowOpen,
        contactName,
        contactPhone,
        contactPhone2: contactPhone2 || null,
        goveId: Number(govId),
        zoneId: Number(zoneId),
        street,
      });
      onSaved();
    } catch (err) {
      if (err instanceof ApiStatusError && err.status === 409) onConflict();
      // The server's reason, e.g. no price for this destination. The customer can pick another.
      else setError(err instanceof ApiStatusError ? err.message : t("common.networkError"));
    } finally {
      setSubmitting(false);
    }
  }

  const govLabel = (gov: ShipGov) => (i18n.language === "ar" ? gov.name : gov.nameEn || gov.name);

  return (
    <form className="action-panel shipment-form" onSubmit={handleSubmit} aria-labelledby="edit-shipment-title">
      <h2 id="edit-shipment-title" className="action-panel__title">
        {t("orderPage.editTitle")}
      </h2>

      <label className="action-panel__field">
        <span>{t("orderPage.codAmount")}</span>
        <input
          className="shipment-form__field"
          value={codAmount}
          onChange={(e) => setCodAmount(e.target.value)}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          dir="ltr"
          required
        />
      </label>

      <label className="action-panel__field">
        <span>{t("addShipment.contactNamePlaceholder")}</span>
        <input
          className="shipment-form__field"
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          maxLength={100}
          required
        />
      </label>

      <label className="action-panel__field">
        <span>{t("addShipment.phonePlaceholder")}</span>
        {phoneFitsMask ? (
          <MaskedInput
            className="shipment-form__field"
            mask={PHONE_MASK}
            value={contactPhone}
            onValueChange={setContactPhone}
            title={t("addShipment.phoneFormat")}
            autoComplete="tel"
            required
          />
        ) : (
          <input
            className="shipment-form__field"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            type="tel"
            dir="ltr"
            maxLength={50}
            required
          />
        )}
      </label>

      <label className="action-panel__field">
        <span>{t("addShipment.phone2Placeholder")}</span>
        <input
          className="shipment-form__field"
          value={contactPhone2}
          onChange={(e) => setContactPhone2(e.target.value)}
          type="tel"
          dir="ltr"
          maxLength={50}
        />
      </label>

      <label className="action-panel__field">
        <span>{t("orderPage.governorate")}</span>
        <select
          className="shipment-form__field"
          value={govId}
          onChange={(e) => handleGovChange(e.target.value)}
          required
        >
          <option value="" disabled>
            {t("addShipment.govPlaceholder")}
          </option>
          {govs.map((gov) => (
            <option key={gov.goveId} value={gov.goveId}>
              {govLabel(gov)}
            </option>
          ))}
        </select>
      </label>

      <label className="action-panel__field">
        <span>{t("orderPage.zone")}</span>
        <select
          className="shipment-form__field"
          value={zoneId}
          onChange={(e) => setZoneId(e.target.value)}
          disabled={!govId}
          required
        >
          <option value="" disabled>
            {govId ? t("addShipment.zonePlaceholder") : t("addShipment.zoneDisabledPlaceholder")}
          </option>
          {zones.map((zone) => (
            <option key={zone.zoneId} value={zone.zoneId}>
              {zone.name}
            </option>
          ))}
        </select>
      </label>

      <label className="action-panel__field">
        <span>{t("addShipment.streetPlaceholder")}</span>
        <input
          className="shipment-form__field"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          maxLength={250}
          required
        />
      </label>

      <label className="shipment-form__check">
        <input type="checkbox" checked={allowOpen} onChange={(e) => setAllowOpen(e.target.checked)} />
        <span>{t("addShipment.allowOpen")}</span>
      </label>

      <small className="action-panel__hint">{t("orderPage.editFreightNote")}</small>

      {(loadError || error) && <p className="action-panel__error">{loadError ?? error}</p>}

      <button type="submit" disabled={submitting}>
        {submitting ? t("addShipment.submitting") : t("orderPage.editSave")}
      </button>
      <button type="button" className="scan-actions__reset" onClick={onCancel} disabled={submitting}>
        {t("orderPage.editCancel")}
      </button>
    </form>
  );
}

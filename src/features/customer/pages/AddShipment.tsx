import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { Amount, DirectedAmount } from "../../../components/Amount";
import { Icon } from "../../../components/Icon";
import { MaskedInput } from "../../../components/MaskedInput";
import { openPdfInNewTab } from "../../../lib/pdfFile";
import {
  getGovs,
  getShipLabelsPdf,
  getZones,
  initOrder,
  saveOrder,
  updateZoneFreight,
  type ShipGov,
  type ShipZone,
  type ShipOrderDraft,
  type ShipAddressDraft,
} from "../../../lib/unifiedApi";
import { PHONE_MASK } from "../shipmentFields";

const EMPTY_ADDRESS: ShipAddressDraft = {
  goveId: 0,
  zoneId: null,
  street: null,
  phone: null,
  phone2: null,
  contactName: null,
};

// Egyptian mobile: 010, 011, 012 or 015, then 8 digits.
const MOBILE = /^01[0125]\d{8}$/;

type FieldName = "phone" | "phone2" | "contactName" | "gov" | "zone" | "street" | "cod";
type Errors = Partial<Record<FieldName, string>>;
const FIELD_ORDER: FieldName[] = ["phone", "phone2", "contactName", "gov", "zone", "street", "cod"];

/** A field with its label always above it (never a placeholder standing in for one). */
function Field({
  label,
  required,
  optional,
  error,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: string;
  error?: string;
  hint?: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className={`form-field${error ? " form-field--invalid" : ""}`}>
      <label className="form-field__label" htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="form-field__required" aria-hidden="true">
            {" *"}
          </span>
        )}
        {optional && <span className="form-field__optional"> ({optional})</span>}
      </label>
      {children}
      {error ? (
        <span className="form-field__error" id={`${htmlFor}-error`} role="alert">
          {error}
        </span>
      ) : (
        hint && <span className="form-field__hint">{hint}</span>
      )}
    </div>
  );
}

export function AddShipment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [draft, setDraft] = useState<ShipOrderDraft | null>(null);
  const [govs, setGovs] = useState<ShipGov[]>([]);
  const [zones, setZones] = useState<ShipZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedGovId, setSelectedGovId] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [street, setStreet] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactPhone2, setContactPhone2] = useState("");
  const [description, setDescription] = useState("");
  const [codAmount, setCodAmount] = useState("");
  const [allowOpen, setAllowOpen] = useState(false);

  // Errors show once Save was tried, then follow the fields as they are fixed.
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [freightAmount, setFreightAmount] = useState<number | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    Promise.all([initOrder(user.apiKey), getGovs(user.apiKey)])
      .then(([draftOrder, govList]) => {
        if (cancelled) return;
        setDraft(draftOrder);
        // The new order starts from the customer's own setting (NewOrder reads it from their account).
        setAllowOpen(draftOrder.allowOpen);
        setGovs(govList);
      })
      .catch(() => {
        if (!cancelled) setLoadError(t("common.networkError"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, t]);

  useEffect(() => {
    if (!user || !selectedGovId) {
      setZones([]);
      setSelectedZoneId("");
      return;
    }
    let cancelled = false;
    setSelectedZoneId("");
    getZones(user.apiKey, Number(selectedGovId))
      .then((zoneList) => {
        if (!cancelled) setZones(zoneList);
      })
      .catch(() => {
        if (!cancelled) setZones([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user, selectedGovId]);

  useEffect(() => {
    if (!user || !draft || !selectedGovId || !selectedZoneId) {
      setFreightAmount(null);
      return;
    }
    let cancelled = false;
    const payload: ShipOrderDraft = {
      ...draft,
      toAddressModel: {
        ...(draft.toAddressModel ?? EMPTY_ADDRESS),
        goveId: Number(selectedGovId),
        zoneId: Number(selectedZoneId),
      },
    };
    updateZoneFreight(user.apiKey, payload)
      .then((result) => {
        if (!cancelled) setFreightAmount(result.freightAmount);
      })
      .catch(() => {
        if (!cancelled) setFreightAmount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user, draft, selectedGovId, selectedZoneId]);

  function validate(): Errors {
    const found: Errors = {};
    if (!MOBILE.test(contactPhone)) found.phone = t(contactPhone ? "addShipment.phoneInvalid" : "addShipment.required");
    if (contactPhone2 && !MOBILE.test(contactPhone2)) found.phone2 = t("addShipment.phoneInvalid");
    if (!contactName.trim()) found.contactName = t("addShipment.required");
    if (!selectedGovId) found.gov = t("addShipment.required");
    if (!selectedZoneId) found.zone = t("addShipment.required");
    if (!street.trim()) found.street = t("addShipment.required");
    if (codAmount && !(Number(codAmount) >= 0)) found.cod = t("addShipment.codInvalid");
    return found;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !draft) return;
    const found = validate();
    setSubmitted(true);
    const firstInvalid = FIELD_ORDER.find((name) => found[name]);
    if (firstInvalid) {
      // Straight to the first field that needs fixing (in form order).
      formRef.current?.querySelector<HTMLElement>(`#ship-${firstInvalid}`)?.focus();
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const payload: ShipOrderDraft = {
        ...draft,
        contactName: contactName.trim(),
        contactPhone,
        contactPhone2: contactPhone2 || null,
        description: description.trim() || null,
        codAmount: Number(codAmount) || 0,
        allowOpen,
        toAddressModel: {
          ...draft.toAddressModel,
          goveId: Number(selectedGovId),
          zoneId: Number(selectedZoneId),
          street: street.trim(),
          contactName: contactName.trim(),
          phone: contactPhone,
          phone2: contactPhone2 || null,
        },
      };
      const saved = await saveOrder(user.apiKey, payload);
      // Optional-chained: the order is saved by now, so an unexpected response
      // body must not surface as a save error.
      setSavedId(saved?.orderId ?? "");
      window.scrollTo({ top: 0 });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("common.networkError"));
    } finally {
      setSubmitting(false);
    }
  }

  // Add another: same governorate and zone (merchants ship to one area in runs), the rest cleared.
  function addAnother() {
    setSavedId(null);
    setPrintError(null);
    setStreet("");
    setContactName("");
    setContactPhone("");
    setContactPhone2("");
    setDescription("");
    setCodAmount("");
    setSubmitted(false);
    if (draft) setAllowOpen(draft.allowOpen);
  }

  async function printLabel() {
    if (!user || !savedId) return;
    setPrintError(null);
    try {
      await openPdfInNewTab(() => getShipLabelsPdf(user.apiKey, [savedId]), `${savedId}.pdf`);
    } catch (err) {
      setPrintError(err instanceof Error ? err.message : t("common.networkError"));
    }
  }

  const govLabel = (gov: ShipGov) => (i18n.language === "ar" ? gov.name : gov.nameEn || gov.name);
  const cod = Number(codAmount) || 0;
  const errors: Errors = submitted ? validate() : {};
  const errorProps = (name: FieldName) =>
    errors[name] ? { "aria-invalid": true as const, "aria-describedby": `ship-${name}-error` } : {};

  if (savedId !== null) {
    return (
      <section className="page">
        <div className="success-sheet" role="status">
          <span className="success-sheet__icon">
            <Icon name="delivered" size={36} />
          </span>
          <h1>{t("addShipment.savedTitle")}</h1>
          {savedId && (
            <p className="success-sheet__id">
              <bdi dir="ltr">{savedId}</bdi>
            </p>
          )}
          <div className="success-sheet__actions">
            {savedId && (
              <button type="button" className="success-sheet__primary" onClick={printLabel}>
                <Icon name="printer" size={20} />
                {t("addShipment.printLabel")}
              </button>
            )}
            <button type="button" onClick={addAnother}>
              <Icon name="plus" size={20} />
              {t("addShipment.addAnother")}
            </button>
            {savedId && (
              <button type="button" onClick={() => navigate(`/customer/shipments/${encodeURIComponent(savedId)}`)}>
                <Icon name="box" size={20} />
                {t("addShipment.viewShipment")}
              </button>
            )}
          </div>
          {printError && <p className="inline-error">{printError}</p>}
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <h1>{t("addShipment.title")}</h1>

      {loading && <p className="card__placeholder">{t("addShipment.loading")}</p>}
      {loadError && <p className="inline-error">{loadError}</p>}

      {!loading && !loadError && draft && (
        <form ref={formRef} className="shipment-form" onSubmit={handleSubmit} noValidate>
          <p className="form-legend">{t("addShipment.requiredLegend")}</p>

          <fieldset className="form-group">
            <legend>{t("addShipment.recipient")}</legend>
            <Field
              label={t("addShipment.phone")}
              required
              htmlFor="ship-phone"
              error={errors.phone}
              hint={t("addShipment.phoneFormat")}
            >
              <MaskedInput
                id="ship-phone"
                className="shipment-form__field"
                mask={PHONE_MASK}
                value={contactPhone}
                onValueChange={setContactPhone}
                placeholder="01xx xxx xxxx"
                autoComplete="tel"
                {...errorProps("phone")}
              />
            </Field>
            <Field
              label={t("addShipment.phone2")}
              optional={t("addShipment.optional")}
              htmlFor="ship-phone2"
              error={errors.phone2}
            >
              <MaskedInput
                id="ship-phone2"
                className="shipment-form__field"
                mask={PHONE_MASK}
                value={contactPhone2}
                onValueChange={setContactPhone2}
                placeholder="01xx xxx xxxx"
                {...errorProps("phone2")}
              />
            </Field>
            <Field label={t("addShipment.contactName")} required htmlFor="ship-contactName" error={errors.contactName}>
              <input
                id="ship-contactName"
                className="shipment-form__field"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                maxLength={100}
                autoComplete="name"
                dir="auto"
                {...errorProps("contactName")}
              />
            </Field>
          </fieldset>

          <fieldset className="form-group">
            <legend>{t("addShipment.address")}</legend>
            <Field label={t("orderPage.governorate")} required htmlFor="ship-gov" error={errors.gov}>
              <select
                id="ship-gov"
                className="shipment-form__field"
                value={selectedGovId}
                onChange={(e) => setSelectedGovId(e.target.value)}
                {...errorProps("gov")}
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
            </Field>
            <Field label={t("orderPage.zone")} required htmlFor="ship-zone" error={errors.zone}>
              <select
                id="ship-zone"
                className="shipment-form__field"
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                disabled={!selectedGovId}
                {...errorProps("zone")}
              >
                <option value="" disabled>
                  {selectedGovId ? t("addShipment.zonePlaceholder") : t("addShipment.zoneDisabledPlaceholder")}
                </option>
                {zones.map((zone) => (
                  <option key={zone.zoneId} value={zone.zoneId}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("addShipment.street")} required htmlFor="ship-street" error={errors.street}>
              <input
                id="ship-street"
                className="shipment-form__field"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                maxLength={250}
                autoComplete="street-address"
                {...errorProps("street")}
              />
            </Field>
          </fieldset>

          <fieldset className="form-group">
            <legend>{t("addShipment.package")}</legend>
            <Field label={t("addShipment.description")} optional={t("addShipment.optional")} htmlFor="ship-description">
              <textarea
                id="ship-description"
                className="shipment-form__field"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={200}
              />
            </Field>
            <Field label={t("addShipment.cod")} htmlFor="ship-cod" error={errors.cod} hint={t("addShipment.codHint")}>
              <div className="input-suffix">
                <input
                  id="ship-cod"
                  className="shipment-form__field"
                  value={codAmount}
                  onChange={(e) => setCodAmount(e.target.value.replace(/[^\d.]/g, ""))}
                  inputMode="decimal"
                  dir="ltr"
                  placeholder="0.00"
                  {...errorProps("cod")}
                />
                <span className="input-suffix__text">{t("addShipment.currency")}</span>
              </div>
            </Field>
            <label className="switch-row">
              <span className="switch-row__text">
                <span className="switch-row__label">{t("addShipment.allowOpen")}</span>
                <span className="form-field__hint">{t("addShipment.allowOpenHelp")}</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                className="switch"
                checked={allowOpen}
                onChange={(e) => setAllowOpen(e.target.checked)}
              />
            </label>
          </fieldset>

          {freightAmount !== null && (
            <dl className="breakdown fee-preview" aria-live="polite">
              <div className="breakdown__row">
                <dt>{t("addShipment.shippingFee")}</dt>
                <dd>
                  <Amount value={freightAmount} />
                </dd>
              </div>
              {cod > 0 && (
                <div className="breakdown__row breakdown__row--total">
                  <dt>{t("addShipment.youReceive")}</dt>
                  <dd>
                    <DirectedAmount value={cod - freightAmount} positiveMeans="owedToYou" />
                  </dd>
                </div>
              )}
              <p className="form-field__hint">{t("addShipment.feeNote")}</p>
            </dl>
          )}

          {submitError && <p className="inline-error">{submitError}</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? t("addShipment.submitting") : t("addShipment.submit")}
          </button>
        </form>
      )}
    </section>
  );
}

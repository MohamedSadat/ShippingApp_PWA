import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import {
  getGovs,
  getZones,
  initOrder,
  saveOrder,
  updateZoneFreight,
  type ShipGov,
  type ShipZone,
  type ShipOrderDraft,
} from "../../../lib/unifiedApi";

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

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [freightAmount, setFreightAmount] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    Promise.all([initOrder(user.apiKey), getGovs(user.apiKey)])
      .then(([draftOrder, govList]) => {
        if (cancelled) return;
        setDraft(draftOrder);
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
        ...draft.toAddressModel,
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !draft) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const payload: ShipOrderDraft = {
        ...draft,
        contactName,
        contactPhone,
        contactPhone2: contactPhone2 || null,
        description: description || null,
        codAmount: Number(codAmount) || 0,
        toAddressModel: {
          ...draft.toAddressModel,
          goveId: Number(selectedGovId),
          zoneId: Number(selectedZoneId),
          street,
          contactName,
          phone: contactPhone,
          phone2: contactPhone2 || null,
        },
      };
      await saveOrder(user.apiKey, payload);
      navigate("/customer/shipments");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t("common.networkError"));
    } finally {
      setSubmitting(false);
    }
  }

  const govLabel = (gov: ShipGov) => (i18n.language === "ar" ? gov.name : gov.nameEn || gov.name);

  return (
    <section className="page">
      <h1>{t("addShipment.title")}</h1>

      {loading && <p className="card__placeholder">{t("addShipment.loading")}</p>}
      {loadError && <p style={{ color: "var(--color-danger)" }}>{loadError}</p>}

      {!loading && !loadError && draft && (
        <form className="login-actions" onSubmit={handleSubmit}>
          <select
            className="login-input"
            value={selectedGovId}
            onChange={(e) => setSelectedGovId(e.target.value)}
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

          <select
            className="login-input"
            value={selectedZoneId}
            onChange={(e) => setSelectedZoneId(e.target.value)}
            disabled={!selectedGovId}
            required
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

          <input
            className="login-input"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder={t("addShipment.streetPlaceholder")}
            required
          />

          <input
            className="login-input"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder={t("addShipment.contactNamePlaceholder")}
            required
          />

          <input
            className="login-input"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder={t("addShipment.phonePlaceholder")}
            type="tel"
            required
          />

          <input
            className="login-input"
            value={contactPhone2}
            onChange={(e) => setContactPhone2(e.target.value)}
            placeholder={t("addShipment.phone2Placeholder")}
            type="tel"
          />

          <textarea
            className="login-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("addShipment.descriptionPlaceholder")}
            rows={2}
          />

          <input
            className="login-input"
            value={codAmount}
            onChange={(e) => setCodAmount(e.target.value)}
            placeholder={t("addShipment.codPlaceholder")}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
          />

          {freightAmount !== null && (
            <p className="card__placeholder">
              {t("addShipment.estimatedFreight", { amount: freightAmount.toFixed(2) })}
            </p>
          )}

          {submitError && <p style={{ color: "var(--color-danger)", margin: 0 }}>{submitError}</p>}

          <button type="submit" disabled={submitting}>
            {submitting ? t("addShipment.submitting") : t("addShipment.submit")}
          </button>
        </form>
      )}
    </section>
  );
}

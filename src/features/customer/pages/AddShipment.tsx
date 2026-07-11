import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../../../auth/AuthContext";
import { initShipment, saveShipment, type AddressBookDraft, type ShipOrderDraft } from "../../../lib/api";

export function AddShipment() {
  const { user } = useAuth();
  const [order, setOrder] = useState<ShipOrderDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedOrderId, setSavedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    setLoading(true);
    setError(null);
    initShipment(user.apiKey)
      .then((result) => {
        if (!cancelled) setOrder(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to initialize shipment");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  function updateAddress(field: keyof AddressBookDraft, value: string) {
    setOrder((prev) => (prev ? { ...prev, ToAddressModel: { ...prev.ToAddressModel, [field]: value } } : prev));
  }

  function updateField(field: string, value: string | number) {
    setOrder((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!user || !order) return;
    setSaving(true);
    setError(null);
    try {
      const result = await saveShipment(user.apiKey, order);
      setSavedOrderId(result.orderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save shipment");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="page">
        <h1>Add Shipment</h1>
        <p className="card__placeholder">Loading...</p>
      </section>
    );
  }

  if (error && !order) {
    return (
      <section className="page">
        <h1>Add Shipment</h1>
        <p className="login-error">{error}</p>
      </section>
    );
  }

  if (savedOrderId) {
    return (
      <section className="page">
        <h1>Add Shipment</h1>
        <div className="card">
          <p>Shipment created successfully.</p>
          <p>
            <strong>Order ID:</strong> {savedOrderId}
          </p>
        </div>
      </section>
    );
  }

  const address = order?.ToAddressModel ?? {};

  return (
    <section className="page">
      <h1>Add Shipment</h1>
      <form onSubmit={handleSave} className="scan-form">
        <label htmlFor="receiver">Receiver</label>
        <input
          id="receiver"
          value={address.ContactName ?? ""}
          onChange={(e) => updateAddress("ContactName", e.target.value)}
          placeholder="Receiver name"
          required
        />

        <label htmlFor="phone">Phone</label>
        <input
          id="phone"
          value={address.Phone ?? ""}
          onChange={(e) => updateAddress("Phone", e.target.value)}
          placeholder="Receiver phone"
          required
        />

        <label htmlFor="governorate">Governorate</label>
        <select id="governorate" disabled defaultValue="">
          <option value="">Coming soon</option>
        </select>

        <label htmlFor="zone">Zone</label>
        <select id="zone" disabled defaultValue="">
          <option value="">Coming soon</option>
        </select>

        <label htmlFor="city">City</label>
        <input id="city" value={address.City ?? ""} onChange={(e) => updateAddress("City", e.target.value)} />

        <label htmlFor="street">Street</label>
        <input id="street" value={address.Street ?? ""} onChange={(e) => updateAddress("Street", e.target.value)} />

        <label htmlFor="building">Building</label>
        <input
          id="building"
          value={address.Building ?? ""}
          onChange={(e) => updateAddress("Building", e.target.value)}
        />

        <label htmlFor="floor">Floor</label>
        <input id="floor" value={address.Floor ?? ""} onChange={(e) => updateAddress("Floor", e.target.value)} />

        <label htmlFor="postalcode">Postal code</label>
        <input
          id="postalcode"
          value={address.Postalcode ?? ""}
          onChange={(e) => updateAddress("Postalcode", e.target.value)}
        />

        <label htmlFor="description">Description</label>
        <input
          id="description"
          value={(order?.Description as string) ?? ""}
          onChange={(e) => updateField("Description", e.target.value)}
        />

        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          value={(order?.Notes as string) ?? ""}
          onChange={(e) => updateField("Notes", e.target.value)}
        />

        <label htmlFor="codAmount">COD Amount</label>
        <input
          id="codAmount"
          type="number"
          step="0.01"
          min="0"
          value={(order?.CODAmount as number) ?? 0}
          onChange={(e) => updateField("CODAmount", Number(e.target.value))}
        />

        {error && <p className="login-error">{error}</p>}
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Shipment"}
        </button>
      </form>
    </section>
  );
}

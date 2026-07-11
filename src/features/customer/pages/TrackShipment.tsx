import { useAuth } from "../../../auth/AuthContext";

export function TrackShipment() {
  const { user } = useAuth();

  return (
    <section className="page">
      <h1>Track a shipment</h1>
      <p>Welcome, {user?.name}.</p>
      {/* TODO: waybill lookup form + status timeline, backed by UnifiedAPI */}
      <div className="card">
        <p className="card__placeholder">No shipments to show yet.</p>
      </div>
    </section>
  );
}

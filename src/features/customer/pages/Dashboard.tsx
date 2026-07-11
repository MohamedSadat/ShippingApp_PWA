import { useAuth } from "../../../auth/AuthContext";

export function Dashboard() {
  const { user } = useAuth();

  return (
    <section className="page">
      <h1>Dashboard</h1>
      <p>Welcome, {user?.name}.</p>
      {/* TODO: shipment summary/status widgets, backed by UnifiedAPI */}
      <div className="card">
        <p className="card__placeholder">No shipments to show yet.</p>
      </div>
    </section>
  );
}

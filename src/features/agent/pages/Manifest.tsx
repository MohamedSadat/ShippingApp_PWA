import { useAuth } from "../../../auth/AuthContext";

export function Manifest() {
  const { user } = useAuth();

  return (
    <section className="page">
      <h1>Today's manifest</h1>
      <p>Agent: {user?.name}.</p>
      {/* TODO: assigned pickups/deliveries list, backed by UnifiedAPI */}
      <div className="card">
        <p className="card__placeholder">No assigned stops yet.</p>
      </div>
    </section>
  );
}

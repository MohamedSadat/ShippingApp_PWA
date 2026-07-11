import { Link } from "react-router-dom";

export function Settings() {
  return (
    <section className="page">
      <h1>Settings</h1>
      <div className="card">
        <p className="card__placeholder">No settings yet.</p>
      </div>
      <div className="card">
        <Link to="/customer/settings/notifications">Notifications</Link>
      </div>
    </section>
  );
}

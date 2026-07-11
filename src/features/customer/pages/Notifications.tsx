export function Notifications() {
  return (
    <section className="page">
      <h1>Notifications</h1>
      {/* TODO: push notification opt-in + history; iOS requires home-screen install first (16.4+) */}
      <div className="card">
        <p className="card__placeholder">No notifications yet.</p>
      </div>
    </section>
  );
}

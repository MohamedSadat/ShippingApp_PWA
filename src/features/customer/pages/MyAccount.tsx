import { useAuth } from "../../../auth/AuthContext";

export function MyAccount() {
  const { user } = useAuth();

  return (
    <section className="page">
      <h1>My Account</h1>
      {/* TODO: account/profile details, backed by UnifiedAPI */}
      <div className="card">
        <p className="card__placeholder">{user?.name}</p>
        <p className="card__placeholder">{user?.company}</p>
      </div>
    </section>
  );
}

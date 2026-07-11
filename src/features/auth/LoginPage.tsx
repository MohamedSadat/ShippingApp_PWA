import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { homePathForRole, type Role } from "../../auth/roles";

/**
 * Placeholder sign-in. Real flow is an open decision (see CLAUDE.md):
 * likely phone-number OTP for Customer, existing staff/agent account
 * for Agent, both against UnifiedAPI. This just picks a role so the
 * gated routing/layouts can be exercised end to end.
 */
export function LoginPage() {
  const { user, signIn } = useAuth();
  const [name, setName] = useState("");

  if (user) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  function handleSignIn(role: Role) {
    signIn({ id: crypto.randomUUID(), name: name || "Guest", role });
  }

  return (
    <section className="page page--centered">
      <h1>Shipping App</h1>
      <p>Sign in to continue.</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="login-input"
      />
      <div className="login-actions">
        <button type="button" onClick={() => handleSignIn("customer")}>
          Continue as Customer
        </button>
        <button type="button" onClick={() => handleSignIn("agent")}>
          Continue as Agent
        </button>
      </div>
    </section>
  );
}

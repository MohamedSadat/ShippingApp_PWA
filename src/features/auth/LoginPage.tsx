import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { homePathForRole } from "../../auth/roles";
import { login } from "../../lib/api";

export function LoginPage() {
  const { user, signIn } = useAuth();
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState(".");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login({ userName, password, company });
      signIn({
        id: result.userName,
        name: result.userName,
        role: result.role,
        apiKey: result.apiKey,
        company: result.company,
        partnerAccountId: result.partnerAccountId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page page--centered">
      <h1>Shipping App</h1>
      <p>Sign in to continue.</p>
      <form className="login-form" onSubmit={handleLogin}>
        <input
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Username"
          className="login-input"
          autoComplete="username"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="login-input"
          autoComplete="current-password"
          required
        />
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company"
          className="login-input"
          required
        />
        {error && <p className="login-error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </section>
  );
}

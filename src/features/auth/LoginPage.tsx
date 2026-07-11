import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../auth/AuthContext";
import { homePathForRole, roleForUserType } from "../../auth/roles";
import { login, loginByKey, type LoginResult } from "../../lib/unifiedApi";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";

type Mode = "credentials" | "apiKey";

/**
 * Auth flow for Customer vs Agent role (see CLAUDE.md open decisions)
 * is still unsettled long-term (phone-number OTP for Customer vs
 * staff account for Agent). For now both roles authenticate through
 * the same UnifiedAPI /api/Login (or /api/Login/LogInByKey) used by
 * other CashGear apps.
 */
export function LoginPage() {
  const { t } = useTranslation();
  const { user, signIn } = useAuth();
  const [mode, setMode] = useState<Mode>("credentials");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("Dot");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  function applyResult(result: LoginResult, fallbackUserName: string, fallbackCompany: string) {
    if (!result.success) {
      setError(result.message || t("login.loginFailed"));
      return;
    }
    if (result.userType === undefined || result.userType === null) {
      // Don't silently fall through to a default role — the server
      // response is missing the field that determines Customer vs
      // Agent, so we can't safely route this account anywhere.
      setError(t("login.incompleteAccount"));
      return;
    }
    signIn({
      userName: result.userName ?? fallbackUserName,
      name: result.name ?? fallbackUserName,
      company: result.company ?? fallbackCompany,
      apiKey: result.apiKey ?? "",
      userType: result.userType,
      partnerAccountId: result.partnerAccountId,
      roles: result.roles,
      role: roleForUserType(result.userType),
    });
  }

  async function handleCredentialsSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login({ userName, password, company });
      applyResult(result, userName, company);
    } catch {
      setError(t("common.networkError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApiKeySubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await loginByKey(apiKeyInput);
      applyResult(result, "", "");
    } catch {
      setError(t("common.networkError"));
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  return (
    <section className="page page--centered">
      <LanguageSwitcher />
      <img src={import.meta.env.VITE_LOGO_URL} alt="CashGear" className="login-logo" />
      <h1>{t("login.title")}</h1>
      <p>{t("login.subtitle")}</p>
      <div className="login-mode-toggle">
        <button
          type="button"
          className={mode === "apiKey" ? "login-mode-toggle__btn login-mode-toggle__btn--active" : "login-mode-toggle__btn"}
          onClick={() => switchMode("apiKey")}
        >
          {t("login.apiKeyTab")}
        </button>
        <button
          type="button"
          className={mode === "credentials" ? "login-mode-toggle__btn login-mode-toggle__btn--active" : "login-mode-toggle__btn"}
          onClick={() => switchMode("credentials")}
        >
          {t("login.credentialsTab")}
        </button>
      </div>

      {mode === "credentials" ? (
        <form className="login-actions" onSubmit={handleCredentialsSubmit}>
          <input
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder={t("login.usernamePlaceholder")}
            className="login-input"
            autoComplete="username"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("login.passwordPlaceholder")}
            type="password"
            className="login-input"
            autoComplete="current-password"
          />
          <select value={company} onChange={(e) => setCompany(e.target.value)} className="login-input">
            <option value="Dot">{t("login.companyDot")}</option>
            <option value="Kit">{t("login.companyKit")}</option>
          </select>
          {error && <p style={{ color: "var(--color-danger)", margin: 0 }}>{error}</p>}
          <button type="submit" disabled={submitting}>
            {submitting ? t("login.signingIn") : t("login.signIn")}
          </button>
        </form>
      ) : (
        <form className="login-actions" onSubmit={handleApiKeySubmit}>
          <input
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder={t("login.apiKeyPlaceholder")}
            className="login-input"
            autoComplete="off"
          />
          {error && <p style={{ color: "var(--color-danger)", margin: 0 }}>{error}</p>}
          <button type="submit" disabled={submitting}>
            {submitting ? t("login.connecting") : t("login.connect")}
          </button>
        </form>
      )}
    </section>
  );
}

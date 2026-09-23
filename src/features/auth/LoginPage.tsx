import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../auth/AuthContext";
import { homePathForRole, roleForUserType } from "../../auth/roles";
import { login, loginByKey, fetchActiveCompanies, type LoginResult, type CompanyOption } from "../../lib/unifiedApi";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import { CompanyLogo } from "../../components/CompanyLogo";
import { loadLastCompanyLogo } from "../../auth/lastCompanyLogo";

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
  const { user, sessionExpired, signIn } = useAuth();
  const [mode, setMode] = useState<Mode>("credentials");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  // Company is an advanced option, hidden by default. Unless the user opens it
  // and picks one, login sends company=null and /api/Login falls back to the
  // user's organization default company. "" = no pick.
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [company, setCompany] = useState("");
  const fallbackCompanies: CompanyOption[] = [
    { value: "Dot", label: t("login.companyDot") },
    { value: "Kit", label: t("login.companyKit") },
  ];
  const [companies, setCompanies] = useState<CompanyOption[]>(fallbackCompanies);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Logo of the company last signed in to on this device (default logo when none).
  const [lastLogo] = useState(loadLastCompanyLogo);

  // Load the live company list once on mount. The endpoint is anonymous, so it
  // works pre-login. On failure we keep the hardcoded fallback already in state,
  // so login stays usable with no user-facing error.
  useEffect(() => {
    let cancelled = false;
    fetchActiveCompanies()
      .then((list) => {
        if (cancelled || list.length === 0) return;
        setCompanies(list);
        setCompany((current) => (list.some((c) => c.value === current) ? current : ""));
      })
      .catch(() => { /* keep the hardcoded fallback — login stays usable */ });
    return () => { cancelled = true; };
  }, []);

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
      companyLogoUrl: result.companyLogoUrl ?? null,
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
      // Only send what's on screen: a pick hidden by collapsing the section is dropped.
      const selectedCompany = showAdvanced && company ? company : null;
      const result = await login({ userName, password, company: selectedCompany });
      applyResult(result, userName, selectedCompany ?? "");
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
      <CompanyLogo url={lastLogo} className="login-logo" />
      <h1>{t("login.title")}</h1>
      <p>{t("login.subtitle")}</p>
      {sessionExpired && !error && <p className="login-notice">{t("login.sessionExpired")}</p>}
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
          <button
            type="button"
            className="login-advanced-toggle"
            aria-expanded={showAdvanced}
            onClick={() => setShowAdvanced((open) => !open)}
          >
            {showAdvanced ? t("login.hideAdvancedOptions") : t("login.advancedOptions")}
          </button>
          {showAdvanced && (
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="login-input"
              aria-label={t("login.company")}
            >
              <option value="">{t("login.defaultCompany")}</option>
              {companies.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          )}
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

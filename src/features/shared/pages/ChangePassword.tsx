import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../auth/AuthContext";
import { useToast } from "../../../components/Toast";
import { changePassword } from "../../../lib/unifiedApi";

// Settings → Change password, for both roles. The server checks the current
// password and its own password rules (length etc.) and answers with the reason
// when it refuses, so only empty fields and a confirm mismatch are checked here.
export function ChangePassword() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Our own messages are kept as keys so they follow a language switch; the
  // server's reason is shown as sent.
  const [error, setError] = useState<{ key: string } | { text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError({ key: "changePassword.required" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setError({ key: "changePassword.mismatch" });
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await changePassword(user.apiKey, currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast(t("changePassword.success"));
    } catch (err) {
      // fetch rejects with a TypeError when the request never reached the server.
      const message = (err as Error).message;
      setError(err instanceof TypeError ? { key: "common.networkError" } : message ? { text: message } : { key: "changePassword.failed" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page">
      <h1>{t("changePassword.title")}</h1>
      <div className="card">
        <form className="login-actions change-password" onSubmit={handleSubmit}>
          {/* Lets password managers tie the new password to this account. */}
          <input type="text" autoComplete="username" value={user?.name ?? ""} readOnly hidden />
          <label className="change-password__field">
            <span>{t("changePassword.current")}</span>
            <input
              type="password"
              className="login-input"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>
          <label className="change-password__field">
            <span>{t("changePassword.new")}</span>
            <input
              type="password"
              className="login-input"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>
          <label className="change-password__field">
            <span>{t("changePassword.confirm")}</span>
            <input
              type="password"
              className="login-input"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" style={{ color: "var(--color-danger)", margin: 0 }}>
              {"key" in error ? t(error.key) : error.text}
            </p>
          )}
          <button type="submit" disabled={submitting}>
            {submitting ? t("changePassword.submitting") : t("changePassword.submit")}
          </button>
        </form>
      </div>
    </section>
  );
}

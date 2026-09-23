import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { setUnauthorizedHandler, type UserType } from "../lib/unifiedApi";
import { rememberCompanyLogo } from "./lastCompanyLogo";
import type { Role } from "./roles";

export interface AuthUser {
  userName: string;
  name: string;
  company: string;
  /** Optional: sessions stored before the API returned it lack it until the next sign-in. */
  companyLogoUrl?: string | null;
  apiKey: string;
  userType: UserType;
  partnerAccountId: string | null;
  roles: string[];
  role: Role;
}

interface AuthContextValue {
  user: AuthUser | null;
  /** True when the user was signed out because the server rejected their key (401). */
  sessionExpired: boolean;
  signIn: (user: AuthUser) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "shippingapp.auth.user";

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Any authenticated API call answering 401 means the stored key is no longer
  // valid, so drop the session. Only when the rejected key is still the stored
  // one — a late response for a previous session must not sign out a fresh login.
  useEffect(() => {
    setUnauthorizedHandler((rejectedKey) => {
      if (loadStoredUser()?.apiKey !== rejectedKey) return;
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
      setSessionExpired(true);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      sessionExpired,
      signIn: (nextUser) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
        rememberCompanyLogo(nextUser.companyLogoUrl);
        setUser(nextUser);
        setSessionExpired(false);
      },
      signOut: () => {
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
      },
    }),
    [user, sessionExpired],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

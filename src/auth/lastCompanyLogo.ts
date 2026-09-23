// The logo of the company last signed in to on this device, shown on the login page.
// Deliberately kept on sign-out (unlike the session); replaced on every sign-in.
const STORAGE_KEY = "shippingapp.lastCompanyLogo";

export function loadLastCompanyLogo(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** A company without a logo clears it, so the login page falls back to the default logo. */
export function rememberCompanyLogo(url: string | null | undefined) {
  try {
    if (url) localStorage.setItem(STORAGE_KEY, url);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode): the login page just shows the default logo.
  }
}

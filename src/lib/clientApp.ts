// Names this app to UnifiedAPI's login log, which otherwise can't tell the
// shipping PWA from the React Native app or the ERP client: they all call the
// same /api/Login. The value is `shipping-pwa/<build> (<standalone|browser>)`,
// the build being the commit the deploy was made from (see vite.config.ts).
export const CLIENT_APP_HEADER = "X-Client-App";

function runsInstalled(): boolean {
  if (typeof window === "undefined") return false;
  // iOS Safari reports a home-screen app through navigator.standalone only.
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia?.("(display-mode: standalone)").matches === true;
}

export function clientAppValue(): string {
  return `shipping-pwa/${__APP_BUILD__} (${runsInstalled() ? "standalone" : "browser"})`;
}

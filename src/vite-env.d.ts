/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_LOGO_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** The commit this build was made from, or "local" (vite.config.ts `define`). */
declare const __APP_BUILD__: string;

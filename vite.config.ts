import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
  version: string;
};

export default defineConfig({
  base: "/",
  // @cashgear/ui is a git dependency with react as a peer — same setup as
  // ERPClient_React: one React copy, and no dev-server pre-bundling of it.
  resolve: { dedupe: ["react", "react-dom"] },
  optimizeDeps: { exclude: ["@cashgear/ui"] },
  // Sent in X-Client-App at login (src/lib/clientApp.ts) so the API's login
  // log says which build signed in. GitHub Actions sets GITHUB_SHA for the deploy.
  // __APP_VERSION__ is package.json's version, shown on Settings; bump it in
  // every commit.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_BUILD__: JSON.stringify((process.env.GITHUB_SHA ?? "local").slice(0, 7)),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "Shipping App",
        short_name: "ShippingApp",
        description: "Track shipments and manage agent pickups/deliveries",
        theme_color: "#2563eb",
        background_color: "#f5f6f8",
        display: "standalone",
        start_url: ".",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      injectManifest: {
        // App-shell precaching only; the agent scan queue lives in
        // IndexedDB (see src/lib/scanQueue.ts), not the SW cache.
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
      },
    }),
  ],
});

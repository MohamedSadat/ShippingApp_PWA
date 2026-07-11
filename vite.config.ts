import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages project sites are served from /<repo-name>/. GITHUB_REPOSITORY
// (set by Actions as "owner/repo") lets the base path stay correct without
// hardcoding the repo name here. Local dev and other hosts fall back to "/".
const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];

export default defineConfig({
  base: repoName ? `/${repoName}/` : "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
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
      workbox: {
        // App-shell precaching only; the agent scan queue lives in
        // IndexedDB (see src/lib/scanQueue.ts), not the SW cache.
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
      },
    }),
  ],
});

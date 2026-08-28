import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Anchor every path to this config file's real location on disk.
const PROJECT_ROOT = path.resolve(fileURLToPath(new URL(".", import.meta.url)));

const plugins = [
  react(),
  tailwindcss(),
  jsxLocPlugin(),
  // Installable app (Android home screen, offline shell). Critical for
  // low-bandwidth markets: assets cache locally, updates apply on next visit.
  VitePWA({
    registerType: "autoUpdate",
    injectRegister: null,
    includeAssets: ["favicon.ico"],
    manifest: {
      name: "Nightfall — My Journey",
      short_name: "Nightfall",
      description: "Private, approval-first university application workspace.",
      theme_color: "#0b0d0e",
      background_color: "#0b0d0e",
      display: "standalone",
      start_url: "/dashboard",
      icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
    },
    workbox: {
      globPatterns: ["**/*.{js,css,html,svg,woff2}"],
      navigateFallbackDenylist: [/^\/api\//],
      runtimeCaching: [],
      clientsClaim: true,
      skipWaiting: true,
      cleanupOutdatedCaches: true,
      maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
    },
  }),
];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(PROJECT_ROOT, "client", "src"),
      "@shared": path.resolve(PROJECT_ROOT, "shared"),
      "@assets": path.resolve(PROJECT_ROOT, "attached_assets"),
    },
  },
  envDir: PROJECT_ROOT,
  root: path.resolve(PROJECT_ROOT, "client"),
  publicDir: path.resolve(PROJECT_ROOT, "client", "public"),
  build: {
    outDir: path.resolve(PROJECT_ROOT, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: ["localhost", "127.0.0.1"],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});

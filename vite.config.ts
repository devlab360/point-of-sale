// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const envMode = process.env.NODE_ENV === "production" ? "production" : "development";
const env = loadEnv(envMode, process.cwd(), "");

export default defineConfig({
  vite: {
    // Inject APP_* from .env into both server (SSR) and client bundles so
    // src/lib/env.ts resolves the same value everywhere at build time.
    define: {
      "process.env.APP_NAME": JSON.stringify(env.APP_NAME || "OneDesk360"),
      "process.env.APP_ENV": JSON.stringify(env.APP_ENV || "development"),
    },
    server: {
      watch: {
        usePolling: false,
        ignored: ["**/node_modules/**", "**/.git/**", "**/.output/**", "**/dist/**"],
      },
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "@tanstack/react-router",
        "@tanstack/router-core",
        "@tanstack/router-core/isServer",
        "@tanstack/router-core/ssr/client",
        "seroval",
        "@tanstack/react-query",
        "lucide-react",
        "sonner",
        "clsx",
        "tailwind-merge",
        "date-fns",
        "drizzle-orm",
        "uuid",
        "zod",
        "buffer",
      ],
      exclude: ["virtual:pwa-register"],
    },
    ssr: {
      external: ["firebase-admin"],
    },
    plugins: [
      VitePWA({
        registerType: "autoUpdate",
        devOptions: {
          enabled: false, // Disabled in dev mode to prevent heavy ServiceWorker rebuilds on every file edit
        },
        manifest: {
          name: "OneDesk360 POS",
          short_name: "OneDesk360",
          description:
            "Premium POS and inventory management for grocery, daily goods, and retail chains.",
          theme_color: "#ffffff",
          background_color: "#ffffff",
          display: "standalone",
          orientation: "portrait",
          start_url: "/",
          icons: [
            {
              src: "/icon-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/icon-512x512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "/icon.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,json}"],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: "/",
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "gstatic-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    serverFns: {
      disableCsrfMiddlewareWarning: true,
    },
  },
});

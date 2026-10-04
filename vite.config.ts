import { defineConfig } from "vite"; // # Build configuration for the independent static PWA.
import react from "@vitejs/plugin-react"; // # React JSX and fast refresh.
import { VitePWA } from "vite-plugin-pwa"; // # Generate a bounded, local-only offline cache.
import { AUDIO_CACHE } from "./src/speech/audio-cache";
const base = process.env.VITE_BASE_PATH || "/"; // # GitHub project Pages lives under /repository-name/.
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      manifest: {
        name: "Lexigrove — Your vocabulary garden",
        short_name: "Lexigrove",
        description: "General and academic English, cultivated through recall.",
        theme_color: "#102f4d",
        background_color: "#c5e1e8",
        display: "standalone",
        start_url: base,
        scope: base,
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webp,json,woff2,txt}"], // # Original compact environment images are available offline; audio warms separately.
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin &&
              /\/assets\/audio\/(?:uk|us)\/[a-z]+\.wav$/.test(url.pathname),
            handler: "CacheFirst",
            options: {
              cacheName: AUDIO_CACHE,
              matchOptions: { ignoreVary: true }, // # These versioned public WAV URLs have fixed bytes; CDN Accept-Encoding variants must not cause an offline media cache miss.
              cacheableResponse: { statuses: [200] },
              rangeRequests: true,
            },
          },
        ], // # Full-body background copies serve media byte ranges; partial streamed responses are never cached as complete clips.
        dontCacheBustURLsMatching: /-[A-Za-z0-9_-]{8,}\.(?:js|css)$/,
        navigateFallback: `${base}index.html`,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 3000000,
      },
    }),
  ],
});

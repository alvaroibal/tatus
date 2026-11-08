import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { execSync } from "child_process";

let gitHash = "dev";
try {
  gitHash = execSync("git rev-parse --short HEAD").toString().trim();
} catch {
  /* no git repo or no commits yet */
}

export default defineConfig({
  base: "/tatus/",
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Tatuś",
        short_name: "Tatuś",
        start_url: "/tatus/",
        scope: "/tatus/",
        display: "standalone",
        background_color: "#F7F5EF",
        theme_color: "#1C2650",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json,woff2}"],
        // La app solo usa alfabeto latino: los subsets cirílico/griego/vietnamita
        // no se precachean. Si el navegador llega a pedir uno, se guarda al vuelo.
        globIgnores: [
          "**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2",
        ],
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith(".woff2"),
            handler: "CacheFirst",
            options: {
              cacheName: "tatus-fonts",
              expiration: { maxEntries: 30 },
            },
          },
        ],
      },
    }),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(gitHash),
  },
  test: {
    environment: "jsdom",
    globals: true,
    // Los tests usan MemoryTransport: un .env.local con Supabase no debe cambiar su resultado.
    env: { VITE_SUPABASE_URL: "", VITE_SUPABASE_ANON_KEY: "" },
  },
});

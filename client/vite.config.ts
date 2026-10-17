import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@meyouquize/shared": path.resolve(__dirname, "../shared/src/index.ts"),
    },
  },
  optimizeDeps: {
    // Monorepo alias: не держим битый prebundle после `npm run build -w shared`.
    exclude: ["@meyouquize/shared"],
  },
  build: {
    rollupOptions: {
      // russia-map-calibrate.html — только локальный dev, в production-сборку не входит.
      output: {
        manualChunks(id) {
          if (id.includes("russia-svg-paths.json") || id.includes("russia-boundary.json")) {
            return "russia-map";
          }
        },
      },
    },
  },
  server: {
    watch: {
      ignored: ["!**/shared/src/**"],
    },
    host: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
        ws: true,
      },
      "/media": {
        target: "http://127.0.0.1:4000",
        changeOrigin: true,
      },
    },
    /**
     * Иначе с http://192.168.x.x:5173 Vite отвечает 403 на /@fs/... (проверка Host).
     * В production-сборке не используется. Узко: allowedHosts: ["192.168.1.8"].
     */
    allowedHosts: true,
    /** Зависимости из корня monorepo (hoist) — файлы вне client/. */
    fs: {
      allow: [__dirname, path.resolve(__dirname, "..")],
    },
  },
  preview: {
    host: true,
    allowedHosts: true,
    fs: {
      allow: [__dirname, path.resolve(__dirname, "..")],
    },
  },
});

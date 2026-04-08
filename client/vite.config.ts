import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
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

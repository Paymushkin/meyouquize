/**
 * Post-vite: сохраняет полный HTML лендинга для SEO.
 * / → dist/index.html; /privacy|/cookies → dist/<path>/index.html
 * SPA-fallback для admin/quiz → dist/spa.html (копия shell до перезаписи).
 */
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.resolve(__dirname, "..");
const distDir = path.join(clientRoot, "dist");

const ROUTES = [
  {
    path: "/",
    outFile: "index.html",
    readySelector: "#hero h1",
    readyText: "МИЮ",
  },
  {
    path: "/interactives",
    outFile: "interactives/index.html",
    readySelector: "#marketing-page h1",
    readyText: "Интерактивы",
  },
  {
    path: "/flash-interview",
    outFile: "flash-interview/index.html",
    readySelector: "#marketing-page h1",
    readyText: "Флеш-интервью",
  },
  {
    path: "/conference",
    outFile: "conference/index.html",
    readySelector: "#marketing-page h1",
    readyText: "конференции",
  },
  {
    path: "/corporate",
    outFile: "corporate/index.html",
    readySelector: "#marketing-page h1",
    readyText: "корпоративе",
  },
  {
    path: "/pharma",
    outFile: "pharma/index.html",
    readySelector: "#marketing-page h1",
    readyText: "экспертные",
  },
  {
    path: "/privacy",
    outFile: "privacy/index.html",
    readySelector: "h1",
    readyText: "Политика конфиденциальности",
  },
  {
    path: "/cookies",
    outFile: "cookies/index.html",
    readySelector: "h1",
    readyText: "Политика cookies",
  },
  {
    path: "/about",
    outFile: "about/index.html",
    // lt() ставит NBSP после «О» — ищем устойчивый фрагмент
    readySelector: "#trust-page h1",
    readyText: "компании МИЮ",
  },
  {
    path: "/contact",
    outFile: "contact/index.html",
    readySelector: "#trust-page h1",
    readyText: "Контакты",
  },
];

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") {
        server.close();
        reject(new Error("Could not allocate port"));
        return;
      }
      const { port } = addr;
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
    server.on("error", reject);
  });
}

function waitForUrl(url, timeoutMs = 60_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url);
        if (res.ok || res.status === 404) {
          resolve();
          return;
        }
      } catch {
        /* retry */
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Preview did not become ready: ${url}`));
        return;
      }
      setTimeout(tick, 200);
    };
    tick();
  });
}

async function launchChromium() {
  try {
    return await chromium.launch({ headless: true });
  } catch (firstError) {
    console.warn("[prerender] Chromium missing, installing…");
    await new Promise((resolve, reject) => {
      const child = spawn("npx", ["playwright", "install", "chromium"], {
        cwd: path.resolve(clientRoot, ".."),
        stdio: "inherit",
        shell: process.platform === "win32",
      });
      child.on("exit", (code) =>
        code === 0 ? resolve() : reject(new Error(`playwright install exited ${code}`)),
      );
      child.on("error", reject);
    });
    return chromium.launch({ headless: true });
  }
}

async function main() {
  const indexPath = path.join(distDir, "index.html");
  await fs.access(indexPath);

  // Пустой Vite-shell для SPA fallback (admin /q /p …)
  await fs.copyFile(indexPath, path.join(distDir, "spa.html"));

  const port = await getFreePort();
  const origin = `http://127.0.0.1:${port}`;

  const preview = spawn(
    "npx",
    ["vite", "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    {
      cwd: clientRoot,
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
      env: { ...process.env, BROWSER: "none" },
    },
  );

  let previewLog = "";
  preview.stdout?.on("data", (chunk) => {
    previewLog += chunk.toString();
  });
  preview.stderr?.on("data", (chunk) => {
    previewLog += chunk.toString();
  });

  const shutdown = async () => {
    if (!preview.killed) {
      preview.kill("SIGTERM");
      await new Promise((r) => setTimeout(r, 300));
      if (!preview.killed) preview.kill("SIGKILL");
    }
  };

  try {
    await waitForUrl(origin);
    const browser = await launchChromium();
    try {
      const context = await browser.newContext({
        reducedMotion: "reduce",
        viewport: { width: 1280, height: 720 },
        locale: "ru-RU",
      });
      await context.addInitScript(() => {
        try {
          // Playwright browser context
          // eslint-disable-next-line no-undef
          window.localStorage.setItem("miyu_landing_cookie_consent_v1", "1");
        } catch {
          /* ignore */
        }
      });

      for (const route of ROUTES) {
        const page = await context.newPage();
        await page.goto(`${origin}${route.path}`, {
          waitUntil: "networkidle",
          timeout: 90_000,
        });
        await page.waitForFunction(
          ({ selector, text }) => {
            // eslint-disable-next-line no-undef -- Playwright browser context
            const el = document.querySelector(selector);
            return Boolean(el && el.textContent && el.textContent.includes(text));
          },
          { selector: route.readySelector, text: route.readyText },
          { timeout: 60_000 },
        );
        // Дождаться lazy-секций (footer / CTA)
        await page.waitForSelector("#request, footer", { timeout: 60_000 }).catch(() => null);
        await new Promise((r) => setTimeout(r, 400));

        // На всякий случай убрать cookie-баннер и старый seo-fallback
        await page.evaluate(() => {
          // eslint-disable-next-line no-undef -- Playwright browser context
          document.getElementById("seo-fallback")?.remove();
          // eslint-disable-next-line no-undef -- Playwright browser context
          document.querySelector('[aria-label="Уведомление о cookies"]')?.remove();
        });

        const html = await page.content();
        const outPath = path.join(distDir, route.outFile);
        await fs.mkdir(path.dirname(outPath), { recursive: true });
        await fs.writeFile(outPath, html, "utf8");
        console.log(`[prerender] wrote ${route.outFile} (${html.length} bytes)`);
        await page.close();
      }
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.error("[prerender] failed:", err);
    if (previewLog.trim()) console.error("[prerender] preview log:\n", previewLog);
    await shutdown();
    process.exitCode = 1;
    return;
  }

  await shutdown();
  console.log("[prerender] done");
}

main();

/**
 * Пишет llms.txt, *.md и 404.html в client/dist для агентов / Accept: text/markdown.
 * Запускать после vite build (+ prerender), чтобы не затереть каталоги страниц.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import content from "../src/pages/landing/agentSiteContent.json" with { type: "json" };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");

async function writeFile(rel, body) {
  const full = path.join(distDir, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, body.endsWith("\n") ? body : `${body}\n`, "utf8");
  console.log(`[agent-md] wrote ${rel} (${Buffer.byteLength(body, "utf8")} bytes)`);
}

function pageMarkdown(title, sections) {
  const parts = [`# ${title}`, ""];
  for (const section of sections) {
    parts.push(`## ${section.heading}`, "", section.body, "");
  }
  parts.push("## См. также", "", "- [llms.txt](/llms.txt)", "- [Sitemap](/sitemap.xml)", "");
  return parts.join("\n");
}

function build404Html(markdownTitle) {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>${markdownTitle}</title>
    <link rel="icon" type="image/svg+xml" href="/logo.svg" />
    <style>
      :root { color-scheme: dark; --fg:#fff; --muted:rgba(255,255,255,.72); --accent:#f3f722; }
      body { margin:0; min-height:100vh; background:#000; color:var(--fg);
        font-family: system-ui, sans-serif; display:grid; place-items:center; padding:24px; }
      main { max-width:36rem; }
      h1 { font-size:clamp(1.6rem,4vw,2.2rem); margin:0 0 12px; }
      p, li { color:var(--muted); line-height:1.55; }
      a { color:var(--accent); }
      ul { padding-left:1.2rem; }
    </style>
  </head>
  <body>
    <main>
      <h1>404 — страница не найдена</h1>
      <p>Такого адреса на сайте МИЮ нет.</p>
      <ul>
        <li><a href="/">Главная</a></li>
        <li><a href="/llms.txt">llms.txt</a></li>
        <li><a href="/sitemap.xml">Sitemap</a></li>
        <li><a href="/about">О компании</a></li>
        <li><a href="/contact">Контакты</a></li>
      </ul>
    </main>
  </body>
</html>
`;
}

async function main() {
  await fs.access(distDir);

  await writeFile("llms.txt", content.llmsTxt);
  await writeFile("index.md", content.home.body);
  await writeFile("about/index.md", pageMarkdown(content.about.h1, content.about.sections));
  await writeFile("contact/index.md", pageMarkdown(content.contact.h1, content.contact.sections));

  for (const [id, page] of Object.entries(content.marketing)) {
    await writeFile(`${id}/index.md`, page.body);
  }
  await writeFile("privacy/index.md", content.legal.privacy.body);
  await writeFile("cookies/index.md", content.legal.cookies.body);

  await writeFile("404.md", content.notFound.markdown);
  await writeFile("404.html", build404Html(content.notFound.title));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

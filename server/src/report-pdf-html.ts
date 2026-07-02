import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { ReportModuleId } from "@meyouquize/shared";
import { formatVoteDistributionPercent, voteDistributionPercentWidth } from "@meyouquize/shared";
import type { PublicEventReport } from "./quiz-service.js";

const require = createRequire(import.meta.url);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let embeddedFontCssCache: string | null = null;

function embeddedReportFontCss(): string {
  if (embeddedFontCssCache) return embeddedFontCssCache;
  const pkgPath = require.resolve("dejavu-fonts-ttf/package.json");
  const fontPath = path.join(path.dirname(pkgPath), "ttf", "DejaVuSans.ttf");
  const base64 = fs.readFileSync(fontPath).toString("base64");
  embeddedFontCssCache = `
@font-face {
  font-family: "ReportPdfFont";
  src: url("data:font/truetype;charset=utf-8;base64,${base64}") format("truetype");
  font-weight: normal;
  font-style: normal;
}`;
  return embeddedFontCssCache;
}

function barRows(
  rows: Array<{ text: string; count: number }>,
  primary: string,
  textMuted: string,
): string {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  if (rows.length === 0) {
    return "";
  }
  return rows
    .map((row) => {
      const pctLabel = formatVoteDistributionPercent(row.count, total);
      const pctWidth = voteDistributionPercentWidth(row.count, total);
      return `
      <div class="bar-row">
        <div class="bar-label">${escapeHtml(row.text)}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pctWidth}%;background:${primary}"></div>
        </div>
        <div class="bar-meta" style="color:${textMuted}">${pctLabel} • ${row.count}</div>
      </div>`;
    })
    .join("");
}

function tagCloudRows(tags: Array<{ text: string; count: number }>, primary: string): string {
  const sorted = [...tags].sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, "ru"));
  if (sorted.length === 0) {
    return `<p class="muted">Пока нет ответов</p>`;
  }
  return `<div class="tag-row">${sorted
    .slice(0, 50)
    .map(
      (tag) =>
        `<span class="tag-chip" style="border-color:${primary};background:${primary}24">${escapeHtml(tag.text)} <strong>${tag.count}</strong></span>`,
    )
    .join("")}</div>`;
}

type ReportPdfSectionContext = {
  report: PublicEventReport;
  primary: string;
  textMuted: string;
  generatedAt: string;
  resolveAssetUrl: (url: string) => string;
};

function buildReportPdfSection(
  moduleId: ReportModuleId,
  ctx: ReportPdfSectionContext,
): string | null {
  const { report, primary, textMuted, generatedAt, resolveAssetUrl } = ctx;
  const b = report.branding;

  switch (moduleId) {
    case "event_header": {
      const logoUrl = resolveAssetUrl(b.brandLogoUrl ?? "");
      const logo = logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="" />` : "";
      return `
      <section class="card">
        <div class="card-head split">
          <div>
            <h1>${escapeHtml(report.config.reportTitle || report.title)}</h1>
            <p class="muted">Событие: ${escapeHtml(report.title)}</p>
            <p class="muted">Сформирован: ${escapeHtml(generatedAt)}</p>
          </div>
          ${logo}
        </div>
      </section>`;
    }
    case "participation_summary": {
      const participationStats = [
        { label: "Участников", value: report.summary.participantsCount },
        { label: "Голосований", value: report.voteQuestions.length },
        { label: "Вопросов спикерам", value: report.speakerQuestions.total },
        { label: "Квизов", value: report.summary.subQuizzesCount },
      ].filter((item) => item.value > 0);
      if (participationStats.length === 0) return null;
      return `
      <section class="card">
        <h2>Итоги участия</h2>
        <div class="stats-grid">
          ${participationStats
            .map(
              (item) =>
                `<div class="stat"><div class="stat-label">${escapeHtml(item.label)}</div><div class="stat-value">${item.value}</div></div>`,
            )
            .join("")}
        </div>
      </section>`;
    }
    case "banners_summary": {
      if (report.banners.length === 0) return null;
      const rows = report.banners
        .map((banner) => {
          const imageUrl = resolveAssetUrl(banner.backgroundUrl);
          const imageCell = imageUrl
            ? `<img class="banner-thumb" src="${escapeHtml(imageUrl)}" alt="" />`
            : `<span class="muted">—</span>`;
          const linkUrl = banner.linkUrl.trim();
          const linkCell = linkUrl
            ? `<a class="banner-link" href="${escapeHtml(linkUrl)}">${escapeHtml(linkUrl)}</a>`
            : `<span class="muted">—</span>`;
          return `<tr>
          <td>${imageCell}</td>
          <td>${linkCell}</td>
          <td class="banner-clicks">${banner.uniqueClicks}</td>
        </tr>`;
        })
        .join("");
      return `
      <section class="card">
        <div class="card-title-row"><h2>Баннеры</h2><span class="badge" style="background:${primary}">${report.banners.length}</span></div>
        <table class="banners-table">
          <thead>
            <tr>
              <th>Картинка</th>
              <th>Ссылка</th>
              <th>Клики</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </section>`;
    }
    case "vote_results": {
      if (report.voteQuestions.length === 0) return null;
      const questions = report.voteQuestions
        .map((question) => {
          const body =
            question.type === "tag_cloud"
              ? tagCloudRows(question.tagCloud, primary)
              : barRows(
                  question.optionStats.slice(0, 8).map((row) => ({
                    text: row.text,
                    count: row.count,
                  })),
                  primary,
                  textMuted,
                );
          return `<div class="question"><h3>${escapeHtml(question.text)}</h3>${body}</div>`;
        })
        .join("");
      return `
      <section class="card">
        <div class="card-title-row"><h2>Результаты голосований</h2><span class="badge" style="background:${primary}">${report.voteQuestions.length}</span></div>
        ${questions}
      </section>`;
    }
    case "quiz_results": {
      if (report.quizQuestions.length === 0) return null;
      const bySubQuiz = new Map<string, typeof report.quizQuestions>();
      for (const question of report.quizQuestions) {
        const key = question.subQuizTitle?.trim() || "Без названия квиза";
        const list = bySubQuiz.get(key) ?? [];
        list.push(question);
        bySubQuiz.set(key, list);
      }
      const groups = Array.from(bySubQuiz.entries())
        .map(([title, questions]) => {
          const items = questions
            .map((question) => {
              const body =
                question.type === "tag_cloud"
                  ? tagCloudRows(question.tagCloud, primary)
                  : barRows(
                      question.optionStats.slice(0, 8).map((row) => ({
                        text: row.text,
                        count: row.count,
                      })),
                      primary,
                      textMuted,
                    );
              return `<div class="question"><h3>${escapeHtml(question.text)}</h3>${body}</div>`;
            })
            .join("");
          return `<div class="group"><h3 class="group-title">${escapeHtml(title)}</h3>${items}</div>`;
        })
        .join("");
      return `
      <section class="card">
        <div class="card-title-row"><h2>Результаты квизов</h2><span class="badge" style="background:${primary}">${report.quizQuestions.length}</span></div>
        ${groups}
      </section>`;
    }
    default:
      return null;
  }
}

export function buildReportPdfHtml(
  report: PublicEventReport,
  options?: { assetOrigin?: string },
): string {
  const b = report.branding;
  const assetOrigin = options?.assetOrigin?.replace(/\/+$/, "") ?? "";
  const resolveAssetUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (!assetOrigin) return trimmed;
    return `${assetOrigin}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
  };
  const primary = b.brandPrimaryColor?.trim() || "#7c5acb";
  const accent = b.brandAccentColor?.trim() || "#1976d2";
  const bg = b.brandBodyBackgroundColor?.trim() || "#0f1d2a";
  const surface = b.brandSurfaceColor?.trim() || "#1a2634";
  const text = b.brandTextColor?.trim() || "#ffffff";
  const textMuted = `${text}b8`;
  const generatedAt = new Date(report.generatedAt).toLocaleString("ru-RU");

  const sectionCtx: ReportPdfSectionContext = {
    report,
    primary,
    textMuted,
    generatedAt,
    resolveAssetUrl,
  };

  const sections: string[] = [];
  for (const moduleId of report.config.reportModules) {
    const html = buildReportPdfSection(moduleId, sectionCtx);
    if (html) sections.push(html);
  }

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <style>
    ${embeddedReportFontCss()}
    :root {
      --primary: ${primary};
      --accent: ${accent};
      --bg: ${bg};
      --surface: ${surface};
      --text: ${text};
      --text-muted: ${textMuted};
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      background: var(--bg);
      color: var(--text);
      font-family: "ReportPdfFont", sans-serif;
      font-size: 14px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    h1 { margin: 0 0 8px; font-size: 28px; }
    h2 { margin: 0 0 12px; font-size: 20px; }
    h3 { margin: 0 0 8px; font-size: 16px; }
    .muted { color: var(--text-muted); margin: 4px 0; }
    .card {
      background: var(--surface);
      border: 1px solid color-mix(in srgb, var(--text) 20%, transparent);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
      break-inside: avoid-page;
      page-break-inside: avoid;
    }
    .split { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
    .logo { max-height: 72px; max-width: 220px; object-fit: contain; }
    .card-title-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
    .badge { color: #fff; border-radius: 999px; min-width: 32px; height: 32px; padding: 0 10px; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
    .stat { border: 1px solid color-mix(in srgb, var(--text) 16%, transparent); border-radius: 10px; padding: 10px; }
    .stat-label { color: var(--text-muted); font-size: 12px; }
    .stat-value { font-size: 28px; font-weight: 900; margin-top: 4px; }
    .group { margin-top: 12px; padding-top: 8px; border-top: 1px solid color-mix(in srgb, var(--text) 12%, transparent); }
    .group-title { font-size: 17px; margin-bottom: 10px; }
    .question { margin: 12px 0; padding: 12px; border: 1px dashed color-mix(in srgb, var(--text) 18%, transparent); border-radius: 10px; }
    .bar-row { margin: 8px 0; }
    .bar-label { margin-bottom: 4px; }
    .bar-track { height: 8px; border-radius: 999px; background: color-mix(in srgb, var(--text) 12%, transparent); overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 999px; }
    .bar-meta { font-size: 12px; margin-top: 4px; text-align: right; }
    .tag-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .tag-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 8px; border: 1px solid; font-size: 13px; }
    .banners-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .banners-table th, .banners-table td { border: 1px solid color-mix(in srgb, var(--text) 16%, transparent); padding: 8px; text-align: left; vertical-align: middle; }
    .banners-table th:last-child, .banners-table td.banner-clicks { text-align: right; width: 72px; }
    .banner-thumb { display: block; max-height: 56px; max-width: 160px; object-fit: contain; border-radius: 6px; }
    .banner-link { color: var(--accent); word-break: break-word; }
  </style>
</head>
<body data-report-pdf-ready="1">
  ${sections.join("\n")}
</body>
</html>`;
}

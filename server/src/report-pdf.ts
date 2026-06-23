import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import type { Request } from "express";
import PDFDocument from "pdfkit";
import type { PublicEventReport } from "./quiz-service.js";
import { buildReportPdfHtml } from "./report-pdf-html.js";

const require = createRequire(import.meta.url);
const PDF_FONT_NAME = "DejaVuSans";

function resolvePdfKitFontPath(): string {
  const pkgPath = require.resolve("dejavu-fonts-ttf/package.json");
  const fontPath = path.join(path.dirname(pkgPath), "ttf", "DejaVuSans.ttf");
  if (!fs.existsSync(fontPath)) {
    throw new Error(`DejaVuSans.ttf not found at ${fontPath}`);
  }
  return fontPath;
}

function createPdfDocument() {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.registerFont(PDF_FONT_NAME, resolvePdfKitFontPath());
  doc.font(PDF_FONT_NAME);
  return doc;
}

async function renderSimplePdf(report: PublicEventReport): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    const doc = createPdfDocument();
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text(report.config.reportTitle || report.title);
    doc.moveDown(0.2);
    doc.fontSize(11).text(`Событие: ${report.title}`);
    doc.text(`Сформирован: ${new Date(report.generatedAt).toLocaleString("ru-RU")}`);
    doc.moveDown();

    if (
      report.config.reportModules.includes("participation_summary") &&
      report.summary.participantsCount +
        report.summary.answersCount +
        report.summary.questionsCount >
        0
    ) {
      doc.fontSize(14).text("Итоги участия");
      doc.fontSize(11).text(`Участников: ${report.summary.participantsCount}`);
      doc.text(`Ответов: ${report.summary.answersCount}`);
      doc.text(`Вопросов: ${report.summary.questionsCount}`);
      doc.moveDown();
    }

    if (
      report.config.reportModules.includes("randomizer_summary") &&
      (report.randomizer.currentWinners.length > 0 || report.randomizer.history.length > 0)
    ) {
      doc.fontSize(14).text("Итоги рандомайзера");
      doc
        .fontSize(11)
        .text(
          `Победители последнего запуска: ${report.randomizer.currentWinners.join(", ") || "—"}`,
        );
      doc.text(`Записей в истории: ${report.randomizer.history.length}`);
      doc.moveDown();
    }

    if (
      report.config.reportModules.includes("speaker_questions_summary") &&
      report.speakerQuestions.total > 0
    ) {
      doc.fontSize(14).text("Вопросы спикерам");
      doc.fontSize(11).text(`Всего вопросов: ${report.speakerQuestions.total}`);
      doc.text(`На экране: ${report.speakerQuestions.onScreen}`);
      report.speakerQuestions.items.slice(0, 20).forEach((item, index) => {
        const reactionsText =
          item.reactions.length > 0
            ? item.reactions.map((reaction) => `${reaction.reaction} ${reaction.count}`).join(", ")
            : "нет";
        doc.text(
          `${index + 1}. [${item.speakerName}] ${item.text} — автор: ${item.author}, реакции: ${reactionsText}`,
        );
      });
      doc.moveDown();
    }

    if (report.config.reportModules.includes("quiz_results") && report.quizQuestions.length > 0) {
      doc.fontSize(14).text("Результаты квизов");
      report.quizQuestions.slice(0, 20).forEach((question, index) => {
        doc.fontSize(11).text(`${index + 1}. ${question.text}`);
      });
      doc.moveDown();
    }

    if (report.config.reportModules.includes("vote_results") && report.voteQuestions.length > 0) {
      doc.fontSize(14).text("Результаты голосований");
      report.voteQuestions.slice(0, 20).forEach((question, index) => {
        doc.fontSize(11).text(`${index + 1}. ${question.text}`);
        if (question.type === "tag_cloud" && question.tagCloud.length > 0) {
          question.tagCloud.slice(0, 15).forEach((tag) => {
            doc.fontSize(10).text(`  ${tag.text} ${tag.count}`);
          });
        } else if (question.optionStats.length > 0) {
          question.optionStats.slice(0, 8).forEach((option) => {
            doc.fontSize(10).text(`  ${option.text} ${option.count}`);
          });
        }
      });
      doc.moveDown();
    }

    if (report.config.reportModules.includes("feedback_summary") && report.feedback.length > 0) {
      report.feedback.forEach((form, formIndex) => {
        if (form.responseCount <= 0) return;
        if (formIndex > 0) doc.moveDown();
        doc.fontSize(14).text(form.title || "Обратная связь");
        doc.fontSize(11).text(`Ответов: ${form.responseCount}`);
        form.scaleStats.forEach((stat) => {
          doc.moveDown(0.2);
          doc.fontSize(12).text(stat.label);
          stat.options.forEach((label, idx) => {
            doc.fontSize(10).text(`  ${label}: ${stat.counts[idx] ?? 0}`);
          });
          if (stat.average != null) {
            doc.fontSize(10).text(`  Среднее: ${stat.average}`);
          }
        });
        const withComments = form.responses.filter((row) => row.comment);
        if (withComments.length > 0) {
          doc.moveDown();
          doc.fontSize(12).text("Комментарии");
          withComments.slice(0, 30).forEach((row, index) => {
            doc.fontSize(10).text(`${index + 1}. [${row.nickname}] ${row.comment}`);
          });
        }
      });
    }

    doc.end();
  });
}

/** Origin страницы отчёта для Playwright: сначала из прокси-заголовков запроса. */
export function resolveReportPdfPageOrigin(
  req: Pick<Request, "get" | "secure">,
  clientOrigins: string[],
): string {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwardedHost) {
    const proto = forwardedProto || "https";
    return `${proto}://${forwardedHost}`.replace(/\/+$/, "");
  }

  const host = req.get("host")?.trim();
  if (host && !/^127\.0\.0\.1:\d+$/.test(host) && !/^localhost:\d+$/i.test(host)) {
    const proto = forwardedProto || (req.secure ? "https" : "http");
    return `${proto}://${host}`.replace(/\/+$/, "");
  }

  const originHeader = req.get("origin")?.trim().replace(/\/+$/, "");
  if (originHeader && clientOrigins.includes(originHeader)) {
    return originHeader;
  }

  return clientOrigins[0]?.replace(/\/+$/, "") || "http://localhost:5173";
}

function resolveSystemChromiumPaths(): string[] {
  const fromEnv = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    process.env.CHROMIUM_PATH,
  ].filter((value): value is string => Boolean(value?.trim()));

  const candidates = [
    ...fromEnv,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
  ];

  return [...new Set(candidates)].filter((candidate) => fs.existsSync(candidate));
}

async function launchPdfBrowser() {
  const { chromium } = await import("playwright");
  const baseArgs = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"];
  const errors: string[] = [];

  let executablePath: string | undefined;
  try {
    executablePath = chromium.executablePath();
  } catch (error) {
    errors.push(`executablePath: ${error instanceof Error ? error.message : String(error)}`);
  }

  const attempts: Array<Record<string, unknown>> = [];
  for (const systemPath of resolveSystemChromiumPaths()) {
    attempts.push({ headless: true, executablePath: systemPath, args: baseArgs });
  }
  if (executablePath) {
    attempts.push({ headless: true, executablePath, args: baseArgs });
  }
  attempts.push({ headless: true, args: baseArgs });
  attempts.push({ headless: true, channel: "chrome", args: baseArgs });
  attempts.push({ headless: true, channel: "msedge", args: baseArgs });

  for (const options of attempts) {
    try {
      return await chromium.launch(options);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(
    `Playwright browser launch failed (${errors.join(" | ")}). Run: bash deploy/scripts/install-pdf-chromium.sh`,
  );
}

async function renderPdfFromHtml(html: string): Promise<Buffer> {
  const browser = await launchPdfBrowser();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 2200 },
    });
    await page.emulateMedia({ media: "screen" });
    await page.setContent(html, { waitUntil: "load", timeout: 60_000 });
    await page.waitForSelector('[data-report-pdf-ready="1"]', { timeout: 15_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await page.waitForTimeout(250);
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

async function renderPdfFromPage(pageUrl: string): Promise<Buffer> {
  const browser = await launchPdfBrowser();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 2200 },
    });
    await page.emulateMedia({ media: "screen" });
    await page.goto(pageUrl, { waitUntil: "load", timeout: 60_000 });
    await page.waitForSelector('[data-report-pdf-ready="1"]', { timeout: 30_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await page.waitForTimeout(300);
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function renderPublicReportPdf(
  report: PublicEventReport,
  options?: { pageUrl?: string; assetOrigin?: string },
): Promise<Buffer> {
  const failures: string[] = [];

  try {
    return await renderPdfFromHtml(
      buildReportPdfHtml(report, { assetOrigin: options?.assetOrigin }),
    );
  } catch (htmlError) {
    const message = htmlError instanceof Error ? htmlError.message : String(htmlError);
    failures.push(`html: ${message}`);
    console.error("[report-pdf] HTML render failed", { error: message });
  }

  if (options?.pageUrl) {
    try {
      return await renderPdfFromPage(options.pageUrl);
    } catch (pageError) {
      const message = pageError instanceof Error ? pageError.message : String(pageError);
      failures.push(`page: ${message}`);
      console.error("[report-pdf] page URL render failed", {
        pageUrl: options.pageUrl,
        error: message,
      });
    }
  }

  try {
    return await renderSimplePdf(report);
  } catch (simpleError) {
    const message = simpleError instanceof Error ? simpleError.message : String(simpleError);
    failures.push(`simple: ${message}`);
    throw new Error(
      `All PDF render paths failed (${failures.join(" | ")}). Run: npm run install:pdf`,
    );
  }
}

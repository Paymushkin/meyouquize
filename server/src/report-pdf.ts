import PDFDocument from "pdfkit";
import type { PublicEventReport } from "./quiz-service.js";

async function renderSimplePdf(report: PublicEventReport): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
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
      });
    }

    doc.end();
  });
}

async function renderPdfFromPage(pageUrl: string): Promise<Buffer> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 2200 },
    });
    await page.emulateMedia({ media: "screen" });
    await page.goto(pageUrl, { waitUntil: "networkidle", timeout: 45_000 });
    await page.waitForSelector("body", { timeout: 15_000 });
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
  options?: { pageUrl?: string },
): Promise<Buffer> {
  if (options?.pageUrl) {
    return renderPdfFromPage(options.pageUrl);
  }
  return renderSimplePdf(report);
}
